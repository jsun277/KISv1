import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/log" className="text-lg font-semibold tracking-tight">
          KIS
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/log"
            className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
          >
            Log
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
          >
            Dashboard
          </Link>
          {user ? (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
