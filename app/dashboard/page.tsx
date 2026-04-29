import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import type { ImpactLog } from "@/lib/types";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("impact_logs")
    .select("*")
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
        <DashboardView logs={logs} />
      </main>
    </>
  );
}
