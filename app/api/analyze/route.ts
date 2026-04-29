import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeImpact } from "@/lib/services/analyzeImpact";
import type { AnalyzeInput } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as AnalyzeInput;
  const analysis = await analyzeImpact(body);

  const { data, error } = await supabase
    .from("impact_logs")
    .insert({
      user_id: user.id,
      tags: body.tags,
      raw_text: body.raw_text || null,
      analysis,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}
