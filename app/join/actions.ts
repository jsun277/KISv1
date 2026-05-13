"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function joinAthlete(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code || code.length !== 6) {
    redirect("/join?error=Enter+a+6-character+code");
  }

  const { error } = await supabase.rpc("consume_invite_code", {
    code_input: code,
  });

  if (error) {
    redirect(`/join?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/athlete");
  redirect("/dashboard");
}
