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

// Wire shape: what the /log form posts to /api/analyze.
export type AnalyzeSubmission = {
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

// ---------- v2: profile + agent context ----------

export const SPORTS = ["combat_sports", "american_football"] as const;
export const SUB_TYPES = [
  "sparring",
  "competition",
  "drills",
  "lineman_work",
  "skill_position",
] as const;

export type Sport = (typeof SPORTS)[number];
export type SubType = (typeof SUB_TYPES)[number];

// UI-strict: which sub_types belong with which sport.
// (DB stores any combination; the form only offers the valid subset.)
export const SUB_TYPES_BY_SPORT: Record<Sport, readonly SubType[]> = {
  combat_sports: ["sparring", "competition", "drills"],
  american_football: ["lineman_work", "skill_position", "drills"],
};

export const SPORT_LABELS: Record<Sport, string> = {
  combat_sports: "Combat sports",
  american_football: "American football",
};

export const SUB_TYPE_LABELS: Record<SubType, string> = {
  sparring: "Sparring",
  competition: "Competition",
  drills: "Drills",
  lineman_work: "Lineman work",
  skill_position: "Skill position",
};

export type Profile = {
  user_id: string;
  sport: Sport;
  sub_type: SubType;
  weight_class: string | null;
  created_at: string;
  updated_at: string;
};

// What the analyzer service consumes: current submission + recent context.
export type AnalyzeContext = {
  submission: AnalyzeSubmission;
  history: ImpactLog[]; // last 5 prior logs, newest first
  profile: Profile | null;
};
