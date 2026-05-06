import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = (data ?? null) as Profile | null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Athlete profile
          </h1>
          <p className="text-sm text-zinc-500">
            {profile
              ? "Update how the agent reads your impacts."
              : "Tell the agent what you do — it shapes how risk is read."}
          </p>
        </div>
        <ProfileForm
          profile={profile}
          next={params.next}
          errorMessage={params.error}
        />
      </main>
    </>
  );
}
