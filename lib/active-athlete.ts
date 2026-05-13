import { createClient } from "@/lib/supabase/server";
import type { Athlete, MembershipRole } from "@/lib/types";

// Picks the user's active athlete for the current session:
// 1. The athlete they own, if any.
// 2. Else the first athlete they coach.
// 3. Else null — caller should redirect to onboarding (athlete creation or /join).
export async function getActiveAthlete(): Promise<{
  athlete: Athlete | null;
  role: MembershipRole | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { athlete: null, role: null };

  const { data } = await supabase
    .from("memberships")
    .select("role, athletes(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return { athlete: null, role: null };

  // Prefer owner. Supabase returns the joined athlete as a single object.
  type Row = { role: MembershipRole; athletes: Athlete };
  const rows = data as unknown as Row[];
  const owner = rows.find((r) => r.role === "owner");
  if (owner) return { athlete: owner.athletes, role: "owner" };

  const coach = rows[0];
  return { athlete: coach.athletes, role: coach.role };
}
