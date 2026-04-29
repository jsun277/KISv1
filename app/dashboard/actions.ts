"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteLog(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("impact_logs").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
