import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  AnalyzeContext,
  AnalyzeResult,
  Athlete,
  ImpactLog,
  ImpactType,
  SeverityColor,
  Zone,
} from "@/lib/types";

const DISCLAIMER =
  "Biomechanical estimates only; not a substitute for clinical diagnostics.";

// Single seam for swapping the underlying model later.
// v3: live Claude when ANTHROPIC_API_KEY is set; deterministic mock otherwise.
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
  est_peak_g: z.number().int().min(0).max(300),
  hit_sp_contribution: z.number().min(0).max(100),
});

const SYSTEM_PROMPT = `You are a Biomechanical Impact Analyst for combat-sports and American-football athletes.

Your job is to estimate the kinetic magnitude of a head impact from the athlete's structured input and free-text notes, then synthesize it against their recent history and physical profile. You are filtering for sub-concussive accumulation so that routine contact does not trigger false alarms.

PEAK G ESTIMATION (the physical estimate):
- Base est_peak_g from intensity + zone:
  Light = 25–50g, Medium = 50–85g, Heavy = 85–130g; non-Head zones reduce by 30%.
- If impact_type is "rotational": ×1.15 to est_peak_g (rotational impacts produce higher angular acceleration).
- If athlete weight class implies Heavyweight (>200lbs, "HW", "heavyweight"): ×1.2 to est_peak_g.
- Concussion phrases in notes ("bell rung", "saw stars", "knocked out") add 20–40g.

RISK SCORE (1–10) is derived FROM est_peak_g + symptoms + history, NOT multiplied by sport scalars:
- Anchor: <40g typically scores 1–3, 40–70g scores 3–6, 70–100g scores 6–8, >100g scores 8–10.
- Overt symptoms (Dizzy, Headache, Tinnitus) each add +1.
- Concussion phrases in notes add +3.
- Loss of consciousness adds +5.
- Elevated 7-day cumulative load can add +1 to +2.

HARD CAP RULES (apply BEFORE returning):
1. If intensity is "Light" AND feelings list is empty or contains only "Clear" AND notes contain no concussion phrases — risk_score MUST be ≤ 4 and severity_color MUST be "Green" or "Yellow" (never Red).
2. If zone is not Head and there are no overt or hidden symptoms — risk_score MUST be ≤ 3.

FREQUENCY HANDLING:
Words in the notes like "several", "multiple", "many", "repeated", "lots of", "a few" describe COUNT of contacts, not severity per contact. They feed cumulative load (Brain Load), they do NOT elevate this single log's risk_score on their own.

SEVERITY MAPPING (apply after Hard Cap):
- Green: risk_score ≤ 3 OR (est_peak_g < 60 AND no concerning symptoms).
- Yellow (sub-concussive): risk_score 4–7, OR est_peak_g 60–90g.
- Red (concussive potential): risk_score ≥ 8, OR est_peak_g > 100g, OR concussion phrases like "saw stars / ringing ears / loss of consciousness".

HIT_sp (Head Impact Telemetry severity profile, 0–100) is a per-hit contribution to the daily impact budget:
  HIT_sp = ((est_peak_g / 200) × 0.6 + vector_modifier × 0.4) × 100
  vector_modifier = 1.0 for rotational head impacts, 0.7 for linear head impacts, 0.4 otherwise.

CALIBRATION ANCHORS (target outputs — calibrate to these):

Anchor 1 — Routine light head contact, no symptoms:
  Input: Zone=Head, Intensity=Light, Activity=Sparring, Feelings=[Clear], Vector=linear, Notes="got hit several times in head, not much feeling"
  Output: { risk_score: 3, est_peak_g: 35, severity_color: "Green", insight: "Routine light contact, no concerning signals." }

Anchor 2 — Moderate symptomatic hit:
  Input: Zone=Head, Intensity=Medium, Activity=Sparring, Feelings=[Headache], Vector=rotational, Notes="took a clean cross"
  Output: { risk_score: 6, est_peak_g: 80, severity_color: "Yellow", insight: "Sub-concussive rotational impact with headache. Monitor 24h." }

Anchor 3 — Heavy hit with concussion phrasing:
  Input: Zone=Head, Intensity=Heavy, Activity=Sparring, Feelings=[Dizzy, Headache], Vector=rotational, Notes="got rocked, saw stars"
  Output: { risk_score: 9, est_peak_g: 130, severity_color: "Red", insight: "Heavy rotational head impact with concussion phrasing. Stop and evaluate." }

Anchor 4 — Body shot:
  Input: Zone=Torso, Intensity=Heavy, Activity=Drills, Feelings=[Clear], Vector=linear, Notes=""
  Output: { risk_score: 2, est_peak_g: 20, severity_color: "Green", insight: "Body work, no head involvement." }

Return ONLY the JSON envelope. insight is one actionable sentence under 20 words. Informational only — never prescribe medical action.`;

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
  return { ...response.parsed_output, disclaimer: DISCLAIMER };
}

function buildUserMessage(context: AnalyzeContext): string {
  const { submission, athlete, history } = context;

  const profileBlock = `ATHLETE PROFILE
- Name: ${athlete.full_name}
- Sport: ${athlete.sport}
- Weight class: ${athlete.weight_class ?? "(unspecified)"}
- Baseline daily HIT_sp threshold: ${athlete.baseline_threshold}`;

  const historyBlock =
    history.length === 0
      ? "RECENT HISTORY\n- (no prior logs)"
      : `RECENT HISTORY (last ${history.length} logs, oldest first)
${[...history].reverse().map(formatHistoryEntry).join("\n")}`;

  const submissionBlock = `CURRENT SUBMISSION
- Zone: ${submission.tags.zone ?? "—"}
- Intensity: ${submission.tags.intensity ?? "—"}
- Activity: ${submission.tags.activity ?? "—"}
- Impact type: ${submission.impact_type ?? "(unspecified)"}
- Feelings: ${submission.tags.feelings.length ? submission.tags.feelings.join(", ") : "(none reported)"}
- Notes: ${submission.raw_text ? `"${submission.raw_text}"` : "(none)"}`;

  return `${profileBlock}\n\n${historyBlock}\n\n${submissionBlock}\n\nReturn the JSON envelope.`;
}

function formatHistoryEntry(log: ImpactLog): string {
  const t = log.tags;
  const date = new Date(log.created_at).toISOString().slice(0, 10);
  const feelings = t.feelings.length ? `, ${t.feelings.join("/")}` : "";
  const peak = log.analysis.est_peak_g
    ? `, est_peak_g=${log.analysis.est_peak_g}`
    : "";
  return `[${date}] ${t.intensity ?? "?"} ${t.activity ?? "?"}, zone=${t.zone ?? "?"}, vector=${log.impact_type ?? "?"}${feelings}${peak} → score=${log.analysis.risk_score}/10 (${log.analysis.severity_color})`;
}

// ---------------- Deterministic mock ----------------
// Same I/O contract as the Claude path. Lets the pipeline run without a key.

function mockAnalyze(context: AnalyzeContext): AnalyzeResult {
  const { submission, athlete, history } = context;
  const vector: ImpactType | null = submission.impact_type;

  // --- Peak G estimation (the physical estimate) ---
  // Sport-context scalars live ONLY here, not on the risk score.
  const intensityG: Record<string, number> = {
    Light: 38,
    Medium: 68,
    Heavy: 105,
  };
  let est = intensityG[submission.tags.intensity ?? ""] ?? 30;
  if (submission.tags.zone !== "Head") est = Math.round(est * 0.7);
  if (vector === "rotational") est = Math.round(est * 1.15);
  if (isHeavyweight(athlete.weight_class)) est = Math.round(est * 1.2);

  // --- Symptom / note scan ---
  const overtBumpers = ["Dizzy", "Headache", "Tinnitus"];
  const overt = (submission.tags.feelings ?? []).filter((f) =>
    overtBumpers.includes(f),
  );

  const text = (submission.raw_text ?? "").toLowerCase();
  const hidden: string[] = [];
  let concussionPhraseHit = false;
  let consciousnessHit = false;

  if (/bell\s*rung|saw?\s*stars/.test(text)) {
    hidden.push("possible concussion phrasing");
    concussionPhraseHit = true;
    est += 20;
  }
  if (/blur(red|ry)|double\s*vision/.test(text)) {
    hidden.push("vision change");
    concussionPhraseHit = true;
  }
  if (/nausea|vomit|throw\s*up/.test(text)) {
    hidden.push("nausea");
    concussionPhraseHit = true;
  }
  if (/forgot|memory|confused|disoriented/.test(text)) {
    hidden.push("cognitive symptom");
    concussionPhraseHit = true;
  }
  if (/knock(ed)?\s*out|black\s*out|passed\s*out/.test(text)) {
    hidden.push("loss of consciousness");
    consciousnessHit = true;
    est += 40;
  }
  if (/ring(ing)?\s*ears?/.test(text)) {
    hidden.push("tinnitus");
    concussionPhraseHit = true;
  }

  est = Math.max(0, Math.min(250, Math.round(est)));

  // --- Risk score derived from est_peak_g + symptoms + history ---
  // No sport multipliers on the score (they belong on est_peak_g).
  let score: number;
  if (est < 40) score = 2;
  else if (est < 70) score = 4;
  else if (est < 100) score = 6;
  else score = 8;

  score += overt.length; // each overt symptom +1
  if (concussionPhraseHit) score += 3;
  if (consciousnessHit) score += 5;

  // Cumulative 7-day load (recency-decayed).
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

  // --- Hard caps for benign-pattern inputs ---
  const feelings = submission.tags.feelings ?? [];
  const feelingsClear = feelings.length === 0 || feelings.every((f) => f === "Clear");

  // Cap 1: Light + Clear + no concussion phrasing → max 4 (Yellow at worst).
  if (
    submission.tags.intensity === "Light" &&
    feelingsClear &&
    !concussionPhraseHit &&
    !consciousnessHit
  ) {
    score = Math.min(score, 4);
  }
  // Cap 2: non-Head zone with no symptoms → max 3 (Green).
  if (
    submission.tags.zone !== "Head" &&
    overt.length === 0 &&
    !concussionPhraseHit &&
    !consciousnessHit
  ) {
    score = Math.min(score, 3);
  }

  score = Math.max(1, Math.min(10, Math.round(score)));

  // --- HIT_sp formula matches the prompt's stated definition ---
  const normalizedMagnitude = Math.min(1, est / 200);
  const vectorModifier =
    submission.tags.zone === "Head"
      ? vector === "rotational"
        ? 1.0
        : 0.7
      : 0.4;
  const hitSp = Math.round(
    (normalizedMagnitude * 0.6 + vectorModifier * 0.4) * 100,
  );

  const severity_color: SeverityColor = pickSeverity(
    score,
    est,
    submission.tags.zone,
    concussionPhraseHit,
    consciousnessHit,
  );
  const symptoms = Array.from(new Set([...overt, ...hidden]));
  const insight = buildMockInsight(severity_color, recentLoad, est, vector);

  return {
    risk_score: score,
    symptoms,
    severity_color,
    insight,
    est_peak_g: est,
    hit_sp_contribution: hitSp,
    disclaimer: DISCLAIMER,
  };
}

function isHeavyweight(weightClass: string | null): boolean {
  if (!weightClass) return false;
  const w = weightClass.toLowerCase();
  if (/heavy|hw|cruiser/.test(w)) return true;
  const lbs = w.match(/(\d{2,3})\s*lb/);
  if (lbs && Number(lbs[1]) >= 200) return true;
  const kg = w.match(/(\d{2,3})\s*kg/);
  if (kg && Number(kg[1]) >= 90) return true;
  return false;
}

function pickSeverity(
  score: number,
  estPeakG: number,
  zone: Zone | null,
  concussionPhraseHit: boolean,
  consciousnessHit: boolean,
): SeverityColor {
  // Peak-G severity gating only matters for Head zone — body shots don't
  // accumulate neurological risk.
  const peakGRed = zone === "Head" && estPeakG >= 100;
  const peakGYellow = zone === "Head" && estPeakG >= 60;

  if (score >= 8 || peakGRed || consciousnessHit) return "Red";
  if (score >= 5 || peakGYellow || concussionPhraseHit) return "Yellow";
  return "Green";
}

function buildMockInsight(
  color: SeverityColor,
  recentLoad: number,
  estPeakG: number,
  vector: ImpactType | null,
): string {
  const vec = vector === "rotational" ? "rotational " : "";
  if (color === "Red") {
    return `High ${vec}impact estimated near ${estPeakG}g. Consider rest and clinical evaluation.`;
  }
  if (color === "Yellow") {
    return recentLoad >= 8
      ? `Sub-concussive ${vec}impact (${estPeakG}g) on top of an elevated 7-day load.`
      : `Sub-concussive ${vec}impact estimated at ${estPeakG}g. Monitor next 24h.`;
  }
  return `Low ${vec}impact (~${estPeakG}g). Normal monitoring.`;
}
