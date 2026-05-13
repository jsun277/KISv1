import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Header } from "@/components/header";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { JoinSubmit } from "./join-submit";
import { joinAthlete } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function JoinPage({
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

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-zinc-100 p-3">
            <KeyRound className="size-5 text-zinc-700" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Join an athlete
          </h1>
          <p className="text-sm text-zinc-500">
            Enter the 6-character invite code your athlete shared with you.
          </p>
        </div>

        <form action={joinAthlete} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Invite code</Label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="flex h-14 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-center font-mono text-2xl font-semibold tracking-[0.4em] uppercase shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>

          {params.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {params.error}
            </p>
          ) : null}

          <JoinSubmit />
        </form>
      </main>
    </>
  );
}
