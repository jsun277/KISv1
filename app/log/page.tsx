import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { getActiveAthlete } from "@/lib/active-athlete";
import { LogForm } from "./log-form";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { athlete, role } = await getActiveAthlete();
  if (!athlete) {
    redirect("/athlete?next=/log");
  }
  if (role !== "owner") {
    // Coaches can read athlete data but not log this week.
    redirect("/dashboard");
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            New impact log
          </h1>
          <p className="text-sm text-zinc-500">
            Logging for <span className="font-medium">{athlete.full_name}</span>
            . Tap to fill in.
          </p>
        </div>
        <LogForm athleteId={athlete.id} />
      </main>
    </>
  );
}
