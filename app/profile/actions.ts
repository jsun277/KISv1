"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  SPORTS,
  SUB_TYPES,
  SUB_TYPES_BY_SPORT,
  type Sport,
  type SubType,
} from "@/lib/types";

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sport = String(formData.get("sport") ?? "");
  const subType = String(formData.get("sub_type") ?? "");
  const weightClass = String(formData.get("weight_class") ?? "").trim();
  const next = String(formData.get("next") ?? "");

  if (!SPORTS.includes(sport as Sport)) {
    redirect("/profile?error=Pick+a+sport");
  }
  if (!SUB_TYPES.includes(subType as SubType)) {
    redirect("/profile?error=Pick+a+context");
  }
  if (!SUB_TYPES_BY_SPORT[sport as Sport].includes(subType as SubType)) {
    redirect("/profile?error=Context+does+not+match+sport");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      sport,
      sub_type: subType,
      weight_class: weightClass || null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/log");
  revalidatePath("/dashboard");

  redirect(next === "/log" ? "/log" : "/dashboard");
}
