export const ZONES = ["Head", "Neck", "Torso", "Limbs"] as const;
export const INTENSITIES = ["Light", "Medium", "Heavy"] as const;
export const FEELINGS = ["Clear", "Dizzy", "Headache", "Tinnitus"] as const;
export const ACTIVITIES = ["Sparring", "Game", "Drills"] as const;

export type Zone = (typeof ZONES)[number];
export type Intensity = (typeof INTENSITIES)[number];
export type Feeling = (typeof FEELINGS)[number];
export type Activity = (typeof ACTIVITIES)[number];

export type ImpactTags = {
  zone: Zone | null;
  intensity: Intensity | null;
  feelings: Feeling[];
  activity: Activity | null;
};

export type AnalyzeInput = {
  tags: ImpactTags;
  raw_text: string;
};

export type SeverityColor = "Green" | "Yellow" | "Red";

export type AnalyzeResult = {
  risk_score: number;
  symptoms: string[];
  severity_color: SeverityColor;
  insight: string;
};

export type ImpactLog = {
  id: string;
  user_id: string;
  tags: ImpactTags;
  raw_text: string | null;
  analysis: AnalyzeResult;
  created_at: string;
};
