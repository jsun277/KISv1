import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getActiveAthlete } from "@/lib/active-athlete";
import type { ImpactLog } from "@/lib/types";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { athlete, role } = await getActiveAthlete();
  if (!athlete) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
          <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              No athlete yet
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Create your own athlete profile to start logging, or join one
              with an invite code.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/athlete"
                className={buttonVariants({ size: "sm" })}
              >
                Create athlete
              </Link>
              <Link
                href="/join"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Join with code
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const { data, error } = await supabase
    .from("impact_logs")
    .select("*")
    .eq("athlete_id", athlete.id)
    .order("created_at", { ascending: false });

  const logs = (data ?? []) as ImpactLog[];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {error ? (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load logs: {error.message}
          </div>
        ) : null}
        <DashboardView logs={logs} athlete={athlete} viewerRole={role!} />
      </main>
    </>
  );
}
