import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  AnalyzeContext,
  AnalyzeResult,
  ImpactLog,
  Profile,
  SeverityColor,
} from "@/lib/types";
import { SPORT_LABELS, SUB_TYPE_LABELS } from "@/lib/types";

// Single seam for swapping the underlying model later.
// v2: real Claude call when ANTHROPIC_API_KEY is set; deterministic mock otherwise.
export async function analyzeImpact(
  context: AnalyzeContext,
): Promise<AnalyzeResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    return callClaude(context);
  }
  return mockAnalyze(context);
}

// ---------------- Claude path ----------------

const AnalyzeResultSchema = z.object({
  risk_score: z.number().int().min(1).max(10),
  symptoms: z.array(z.string()),
  severity_color: z.enum(["Green", "Yellow", "Red"]),
  insight: z.string().max(200),
});

const SYSTEM_PROMPT = `You are the KIS Impact Parser for combat-sports and American-football athletes.

Analyze the current training-impact log against the athlete's recent history and sport profile.
Detect cumulative neurological risk and patterns of sub-concussive accumulation — recent impacts
compound on prior ones. A heavy sparring week followed by another heavy session is higher risk
than the same session in isolation.

Extract hidden symptoms from the athlete's free-text notes. Phrases that warrant attention
include "got my bell rung", "saw stars", "blurry/double vision", "nausea", "knocked out",
"blacked out", "memory loss", "confused/disoriented".

Sport context shifts the risk profile:
- combat_sports / sparring or competition: rotational head impacts, often repeated per round
- american_football / lineman_work: linear helmet-to-helmet contact on every play
- american_football / skill_position: variable-impact, often blindside or open-field
- *_drills: lower baseline impact

Return a JSON envelope: { risk_score (1-10), symptoms (array), severity_color (Green|Yellow|Red), insight (single actionable sentence under 20 words) }.

Insight is informational only. Never prescribe a medical action.`;

async function callClaude(context: AnalyzeContext): Promise<AnalyzeResult> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: zodOutputFormat(AnalyzeResultSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(context) }],
  });

  if (!response.parsed_output) {
    throw new Error("Claude returned an unparseable response");
  }
  return response.parsed_output;
}

function buildUserMessage(context: AnalyzeContext): string {
  const { submission, history, profile } = context;

  const profileBlock = profile
    ? `ATHLETE PROFILE
- Sport: ${SPORT_LABELS[profile.sport]} (${profile.sport})
- Context: ${SUB_TYPE_LABELS[profile.sub_type]} (${profile.sub_type})${
        profile.weight_class ? `\n- Weight class: ${profile.weight_class}` : ""
      }`
    : "ATHLETE PROFILE\n- (not yet set — apply generic heuristics)";

  const historyBlock =
    history.length === 0
      ? "RECENT HISTORY\n- (no prior logs)"
      : `RECENT HISTORY (last ${history.length} logs, oldest first)
${[...history].reverse().map(formatHistoryEntry).join("\n")}`;

  const submissionBlock = `CURRENT SUBMISSION
- Zone: ${submission.tags.zone ?? "—"}
- Intensity: ${submission.tags.intensity ?? "—"}
- Activity: ${submission.tags.activity ?? "—"}
- Feelings: ${submission.tags.feelings.length ? submission.tags.feelings.join(", ") : "(none reported)"}
- Notes: ${submission.raw_text ? `"${submission.raw_text}"` : "(none)"}`;

  return `${profileBlock}\n\n${historyBlock}\n\n${submissionBlock}\n\nReturn the JSON envelope.`;
}

function formatHistoryEntry(log: ImpactLog): string {
  const t = log.tags;
  const date = new Date(log.created_at).toISOString().slice(0, 10);
  const feelings = t.feelings.length ? `, ${t.feelings.join("/")}` : "";
  return `[${date}] ${t.intensity ?? "?"} ${t.activity ?? "?"}, zone=${t.zone ?? "?"}${feelings} → score=${log.analysis.risk_score}/10 (${log.analysis.severity_color})`;
}

// ---------------- Deterministic mock ----------------
// Used when ANTHROPIC_API_KEY is unset. Consumes profile + history so v2's
// "agent" surface produces meaningfully richer output than v1, even unsigned.

function mockAnalyze(context: AnalyzeContext): AnalyzeResult {
  const { submission, history, profile } = context;

  const intensityScore: Record<string, number> = {
    Light: 2,
    Medium: 5,
    Heavy: 8,
  };
  let score = intensityScore[submission.tags.intensity ?? ""] ?? 2;

  if (submission.tags.zone === "Head") score += 2;

  // Sport-context weighting.
  if (profile) {
    if (
      profile.sport === "american_football" &&
      profile.sub_type === "lineman_work" &&
      submission.tags.zone === "Head"
    ) {
      score += 1; // every-play helmet contact
    }
    if (
      profile.sport === "combat_sports" &&
      (profile.sub_type === "sparring" || profile.sub_type === "competition")
    ) {
      score += 1; // rotational impacts compound
    }
    if (profile.sub_type === "drills") {
      score -= 1; // lower-intensity baseline
    }
  }

  const overtBumpers = ["Dizzy", "Headache", "Tinnitus"];
  const overt = (submission.tags.feelings ?? []).filter((f) =>
    overtBumpers.includes(f),
  );
  score += overt.length;

  const text = (submission.raw_text ?? "").toLowerCase();
  const hidden: string[] = [];
  if (/bell\s*rung|saw?\s*stars/.test(text)) {
    hidden.push("possible concussion phrasing");
    score += 3;
  }
  if (/blur(red|ry)|double\s*vision/.test(text)) {
    hidden.push("vision change");
    score += 2;
  }
  if (/nausea|vomit|throw\s*up/.test(text)) {
    hidden.push("nausea");
    score += 2;
  }
  if (/forgot|memory|confused|disoriented/.test(text)) {
    hidden.push("cognitive symptom");
    score += 2;
  }
  if (/knock(ed)?\s*out|black\s*out|passed\s*out/.test(text)) {
    hidden.push("loss of consciousness");
    score += 5;
  }

  // Cumulative load: prior 7 days of risk score, sums of recency-weighted impact.
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  let recentLoad = 0;
  for (const h of history) {
    const ageMs = now - new Date(h.created_at).getTime();
    if (ageMs >= sevenDaysMs) continue;
    const daysAgo = ageMs / (24 * 60 * 60 * 1000);
    recentLoad += h.analysis.risk_score / (1 + daysAgo);
  }
  if (recentLoad >= 15) {
    hidden.push("heavy 7-day load");
    score += 2;
  } else if (recentLoad >= 8) {
    hidden.push("elevated 7-day load");
    score += 1;
  }

  score = Math.max(1, Math.min(10, score));

  const symptoms = Array.from(new Set([...overt, ...hidden]));

  const severity_color: SeverityColor =
    score >= 7 ? "Red" : score >= 4 ? "Yellow" : "Green";

  const insight = buildMockInsight(severity_color, recentLoad, profile);

  return { risk_score: score, symptoms, severity_color, insight };
}

function buildMockInsight(
  color: SeverityColor,
  recentLoad: number,
  profile: Profile | null,
): string {
  const ctx = profile ? ` for ${SUB_TYPE_LABELS[profile.sub_type].toLowerCase()}` : "";
  if (color === "Red") {
    return `High-risk impact pattern${ctx}. Consider rest and medical evaluation.`;
  }
  if (color === "Yellow") {
    return recentLoad >= 8
      ? `Cumulative load building${ctx}. Monitor symptoms over the next 24 hours.`
      : `Moderate impact${ctx}. Monitor symptoms over the next 24 hours.`;
  }
  return `Low impact${ctx}. Continue normal monitoring.`;
}
