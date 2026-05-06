import Link from "next/link";
import {
  Activity,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
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
        <Link
          href="/log"
          className="flex items-center gap-1.5 text-lg font-semibold tracking-tight"
        >
          <Activity className="size-5" aria-hidden />
          KIS
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/log" icon={<ClipboardPlus className="size-4" />}>
            Log
          </NavLink>
          <NavLink
            href="/dashboard"
            icon={<LayoutDashboard className="size-4" />}
          >
            Dashboard
          </NavLink>
          <NavLink href="/profile" icon={<UserRound className="size-4" />}>
            Profile
          </NavLink>
          {user ? (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-100"
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}
