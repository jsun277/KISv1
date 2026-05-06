import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeImpact } from "@/lib/services/analyzeImpact";
import type { AnalyzeSubmission, ImpactLog, Profile } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submission = (await req.json()) as AnalyzeSubmission;

  // Pull the agent's context: profile + last 5 prior logs (newest first).
  const [profileResult, historyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("impact_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profile = (profileResult.data ?? null) as Profile | null;
  const history = (historyResult.data ?? []) as ImpactLog[];

  let analysis;
  try {
    analysis = await analyzeImpact({ submission, history, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("impact_logs")
    .insert({
      user_id: user.id,
      tags: submission.tags,
      raw_text: submission.raw_text || null,
      analysis,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}
