"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InviteCode } from "@/lib/types";
import { generateInvite, revokeInvite } from "./actions";

export function InviteSection({
  athleteId,
  codes,
}: {
  athleteId: string;
  codes: InviteCode[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const onGenerate = () => {
    setError(null);
    start(async () => {
      const result = await generateInvite(athleteId);
      if (result.error) setError(result.error);
    });
  };

  const onCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const onRevoke = (code: string) => {
    start(async () => {
      await revokeInvite(code);
    });
  };

  const active = codes.filter((c) => !c.used_at && new Date(c.expires_at) > new Date());

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4 text-zinc-700" />
            Coach invite codes
          </h2>
          <p className="text-xs text-zinc-500">
            Share a 6-digit code with your coach. Codes expire in 24 hours and
            can be used once.
          </p>
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          size="sm"
        >
          {pending ? "Generating..." : "+ New code"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {active.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">No active codes.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {active.map((c) => (
            <li
              key={c.code}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <div className="flex items-baseline gap-3">
                <code className="font-mono text-lg font-semibold tracking-widest text-zinc-900">
                  {c.code}
                </code>
                <span className="text-xs text-zinc-500">
                  expires {new Date(c.expires_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onCopy(c.code)}
                  className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  <Copy className="size-3.5" />
                  <span className="sr-only">Copy</span>
                </button>
                {copied === c.code ? (
                  <span className="text-xs text-emerald-600">Copied</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRevoke(c.code)}
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="Revoke code"
                  title="Revoke code"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
