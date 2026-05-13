export const ZONES = ["Head", "Neck", "Torso", "Limbs"] as const;
export const INTENSITIES = ["Light", "Medium", "Heavy"] as const;
export const FEELINGS = ["Clear", "Dizzy", "Headache", "Tinnitus"] as const;
export const ACTIVITIES = ["Sparring", "Game", "Drills"] as const;
export const IMPACT_TYPES = ["linear", "rotational"] as const;

export type Zone = (typeof ZONES)[number];
export type Intensity = (typeof INTENSITIES)[number];
export type Feeling = (typeof FEELINGS)[number];
export type Activity = (typeof ACTIVITIES)[number];
export type ImpactType = (typeof IMPACT_TYPES)[number];

export const IMPACT_TYPE_LABELS: Record<ImpactType, string> = {
  linear: "Linear",
  rotational: "Rotational",
};

export type ImpactTags = {
  zone: Zone | null;
  intensity: Intensity | null;
  feelings: Feeling[];
  activity: Activity | null;
};

// Wire shape: what /log posts to /api/analyze.
export type AnalyzeSubmission = {
  athlete_id: string;
  tags: ImpactTags;
  impact_type: ImpactType | null;
  raw_text: string;
};

export type SeverityColor = "Green" | "Yellow" | "Red";

export type AnalyzeResult = {
  risk_score: number;
  symptoms: string[];
  severity_color: SeverityColor;
  insight: string;
  // v3 fields — required for new analyses, optional on the type because logs
  // persisted before v3 won't have them in their stored analysis JSON.
  est_peak_g?: number;
  hit_sp_contribution?: number;
  disclaimer?: string;
};

export type ImpactLog = {
  id: string;
  user_id: string;
  athlete_id: string;
  tags: ImpactTags;
  impact_type: ImpactType | null;
  raw_text: string | null;
  observer_notes: string | null;
  author_role: "self" | "third_party";
  analysis: AnalyzeResult;
  created_at: string;
};

// ---------- v3: athlete entity + memberships ----------

export const SPORTS = ["combat_sports", "american_football"] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = {
  combat_sports: "Combat sports",
  american_football: "American football",
};

export type Athlete = {
  id: string;
  full_name: string;
  sport: Sport;
  weight_class: string | null;
  baseline_threshold: number;
  created_at: string;
  updated_at: string;
};

export type MembershipRole = "owner" | "coach";

export type Membership = {
  id: string;
  user_id: string;
  athlete_id: string;
  role: MembershipRole;
  created_at: string;
};

// A membership joined with the athlete it points to — what we read in the UI.
export type MembershipWithAthlete = Membership & { athletes: Athlete };

export type InviteCode = {
  code: string;
  athlete_id: string;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
};

// Analyzer context shape consumed by analyzeImpact().
export type AnalyzeContext = {
  submission: AnalyzeSubmission;
  athlete: Athlete;
  history: ImpactLog[]; // last 5 prior logs, newest first
};
