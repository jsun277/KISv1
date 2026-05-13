import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeImpact } from "@/lib/services/analyzeImpact";
import type { AnalyzeSubmission, Athlete, ImpactLog } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submission = (await req.json()) as AnalyzeSubmission;
  if (!submission.athlete_id) {
    return NextResponse.json(
      { error: "athlete_id required" },
      { status: 400 },
    );
  }

  // Confirm the caller is an owner of this athlete (Tier 1 — only owners log).
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("athlete_id", submission.athlete_id)
    .maybeSingle();
  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only the athlete owner can log this week" },
      { status: 403 },
    );
  }

  const [athleteResult, historyResult] = await Promise.all([
    supabase
      .from("athletes")
      .select("*")
      .eq("id", submission.athlete_id)
      .single(),
    supabase
      .from("impact_logs")
      .select("*")
      .eq("athlete_id", submission.athlete_id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (athleteResult.error || !athleteResult.data) {
    return NextResponse.json(
      { error: athleteResult.error?.message ?? "Athlete not found" },
      { status: 404 },
    );
  }

  const athlete = athleteResult.data as Athlete;
  const history = (historyResult.data ?? []) as ImpactLog[];

  let analysis;
  try {
    analysis = await analyzeImpact({ submission, athlete, history });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("impact_logs")
    .insert({
      user_id: user.id,
      athlete_id: submission.athlete_id,
      tags: submission.tags,
      impact_type: submission.impact_type,
      raw_text: submission.raw_text || null,
      author_role: "self",
      analysis,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}
