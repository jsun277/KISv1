import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import type { Athlete, InviteCode } from "@/lib/types";
import { AthleteForm } from "./athlete-form";
import { InviteSection } from "./invite-section";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function AthletePage({
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

  // Fetch user's owned athlete (if any).
  const { data: ownerMembership } = await supabase
    .from("memberships")
    .select("athlete_id, athletes(*)")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  type OwnerRow = { athlete_id: string; athletes: Athlete };
  const owner = ownerMembership as OwnerRow | null;
  const athlete = owner?.athletes ?? null;

  // Pull current invite codes for this athlete.
  let codes: InviteCode[] = [];
  if (athlete) {
    const { data } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("athlete_id", athlete.id)
      .order("created_at", { ascending: false });
    codes = (data ?? []) as InviteCode[];
  }

  // List coached athletes for visibility.
  const { data: coachData } = await supabase
    .from("memberships")
    .select("athletes(*)")
    .eq("user_id", user.id)
    .eq("role", "coach");
  type CoachRow = { athletes: Athlete };
  const coached = ((coachData ?? []) as unknown as CoachRow[])
    .map((r) => r.athletes)
    .filter(Boolean);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {athlete ? "Your athlete" : "Create your athlete"}
          </h1>
          <p className="text-sm text-zinc-500">
            {athlete
              ? "Athlete profile shapes how the Virtual Sensor reads your impacts."
              : "Tell the system what you compete in — this is required before logging."}
          </p>
        </div>

        <AthleteForm
          athlete={athlete}
          next={params.next}
          errorMessage={params.error}
        />

        {athlete ? (
          <div className="mt-8">
            <InviteSection athleteId={athlete.id} codes={codes} />
          </div>
        ) : null}

        {coached.length > 0 ? (
          <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-medium">Athletes you coach</h2>
            <ul className="mt-3 space-y-2">
              {coached.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{a.full_name}</span>
                  <span className="text-zinc-500"> · {a.sport.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-8 text-center text-xs text-zinc-400">
            Got a coach&apos;s invite code?{" "}
            <Link href="/join" className="font-medium text-zinc-700 underline">
              Join an athlete
            </Link>
            .
          </p>
        )}
      </main>
    </>
  );
}
