"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SPORTS, type Sport } from "@/lib/types";

// 6-char alphanumeric, no I/O/0/1 for readability.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateInviteCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function saveAthlete(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const sport = String(formData.get("sport") ?? "");
  const weightClass = String(formData.get("weight_class") ?? "").trim();
  const baselineRaw = String(formData.get("baseline_threshold") ?? "1000");
  const baseline = Number.parseFloat(baselineRaw);
  const next = String(formData.get("next") ?? "");

  if (!fullName) redirect("/athlete?error=Name+required");
  if (!SPORTS.includes(sport as Sport)) redirect("/athlete?error=Pick+a+sport");
  if (!Number.isFinite(baseline) || baseline <= 0) {
    redirect("/athlete?error=Invalid+baseline");
  }

  // Does this user already own an athlete?
  const { data: existing } = await supabase
    .from("memberships")
    .select("athlete_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("athletes")
      .update({
        full_name: fullName,
        sport,
        weight_class: weightClass || null,
        baseline_threshold: baseline,
      })
      .eq("id", existing.athlete_id);
    if (error) redirect(`/athlete?error=${encodeURIComponent(error.message)}`);
  } else {
    const { data: created, error } = await supabase
      .from("athletes")
      .insert({
        full_name: fullName,
        sport,
        weight_class: weightClass || null,
        baseline_threshold: baseline,
      })
      .select()
      .single();
    if (error || !created) {
      redirect(`/athlete?error=${encodeURIComponent(error?.message ?? "Insert failed")}`);
    }
    const { error: memberError } = await supabase
      .from("memberships")
      .insert({ user_id: user.id, athlete_id: created.id, role: "owner" });
    if (memberError) {
      redirect(`/athlete?error=${encodeURIComponent(memberError.message)}`);
    }
  }

  revalidatePath("/athlete");
  revalidatePath("/log");
  revalidatePath("/dashboard");

  redirect(next === "/log" ? "/log" : "/athlete");
}

export async function generateInvite(athleteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("invite_codes").insert({
    code,
    athlete_id: athleteId,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/athlete");
  return { code };
}

export async function revokeInvite(code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("invite_codes").delete().eq("code", code);
  revalidatePath("/athlete");
  return { ok: true };
}
