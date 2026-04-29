import type { AnalyzeInput, AnalyzeResult, SeverityColor } from "@/lib/types";

// Single seam for swapping the underlying model later (Claude, DeepSeek, Qwen, ...).
// v1: deterministic mock so the pipeline ships without an API key.
export async function analyzeImpact(input: AnalyzeInput): Promise<AnalyzeResult> {
  // When ready: branch on env (e.g. ANTHROPIC_API_KEY / DEEPSEEK_API_KEY) and
  // call the provider. Keep this function's signature stable.
  return mockAnalyze(input);
}

function mockAnalyze({ tags, raw_text }: AnalyzeInput): AnalyzeResult {
  const intensityScore: Record<string, number> = { Light: 2, Medium: 5, Heavy: 8 };
  let score = intensityScore[tags.intensity ?? ""] ?? 2;

  if (tags.zone === "Head") score += 2;

  const overtBumpers = ["Dizzy", "Headache", "Tinnitus"];
  const overt = (tags.feelings ?? []).filter((f) => overtBumpers.includes(f));
  score += overt.length;

  const text = (raw_text ?? "").toLowerCase();
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

  score = Math.max(1, Math.min(10, score));

  const symptoms = Array.from(new Set([...overt, ...hidden]));

  const severity_color: SeverityColor =
    score >= 7 ? "Red" : score >= 4 ? "Yellow" : "Green";

  const insight =
    severity_color === "Red"
      ? "High-risk impact pattern. Consider rest and medical evaluation."
      : severity_color === "Yellow"
        ? "Moderate impact. Monitor symptoms over the next 24 hours."
        : "Low impact. Continue normal monitoring.";

  return { risk_score: score, symptoms, severity_color, insight };
}
