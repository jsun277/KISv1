import Link from "next/link";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "./actions";
import { SubmitButton } from "./submit-button";

type SearchParams = Promise<{ mode?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const error = params.error;

  const action = mode === "signup" ? signUp : signIn;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">KIS</h1>
          <p className="text-sm text-zinc-500">
            Kinetic Intelligence System — track impacts, surface risk.
          </p>
        </div>

        <div className="flex rounded-md border border-zinc-200 p-1 text-sm">
          <Link
            href="/login?mode=signin"
            className={`flex-1 rounded px-3 py-1.5 text-center transition ${
              mode === "signin"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className={`flex-1 rounded px-3 py-1.5 text-center transition ${
              mode === "signup"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Sign up
          </Link>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <SubmitButton label={mode === "signup" ? "Create account" : "Sign in"} />
        </form>
      </div>
    </main>
  );
}
