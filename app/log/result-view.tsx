"use client";

import Link from "next/link";
import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImpactLog, SeverityColor } from "@/lib/types";

const ICONS: Record<SeverityColor, typeof AlertOctagon> = {
  Green: CheckCircle2,
  Yellow: AlertTriangle,
  Red: AlertOctagon,
};

const tone: Record<
  SeverityColor,
  { ring: string; text: string; bg: string; label: string; bar: string }
> = {
  Green: {
    ring: "ring-emerald-500/40",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    label: "Low risk",
    bar: "bg-emerald-500",
  },
  Yellow: {
    ring: "ring-amber-500/40",
    text: "text-amber-700",
    bg: "bg-amber-50",
    label: "Moderate risk",
    bar: "bg-amber-500",
  },
  Red: {
    ring: "ring-red-500/40",
    text: "text-red-700",
    bg: "bg-red-50",
    label: "High risk",
    bar: "bg-red-500",
  },
};

export function ResultView({
  log,
  onLogAnother,
}: {
  log: ImpactLog;
  onLogAnother: () => void;
}) {
  const t = tone[log.analysis.severity_color];
  const score = log.analysis.risk_score;
  const Icon = ICONS[log.analysis.severity_color];

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl ${t.bg} ring-2 ${t.ring} p-6`}>
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Logged · analysis complete
        </div>
        <div
          className={`mt-2 flex items-center gap-2 text-3xl font-semibold ${t.text}`}
        >
          <Icon className="size-7" aria-hidden />
          {t.label}
        </div>
        <div className="mt-1 text-sm text-zinc-700">{log.analysis.insight}</div>

        <div className="mt-5">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Risk score
            </span>
            <span className={`text-sm font-semibold ${t.text}`}>
              {score}/10
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full ${t.bar} transition-all`}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {log.analysis.symptoms.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Symptoms detected
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {log.analysis.symptoms.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
          {log.raw_text ? (
            <p className="mt-3 text-xs italic text-zinc-500">
              From your notes: &ldquo;{log.raw_text}&rdquo;
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          What you logged
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            log.tags.zone,
            log.tags.intensity,
            log.tags.activity,
            ...(log.tags.feelings ?? []),
          ]
            .filter(Boolean)
            .map((t) => (
              <Badge key={t as string} variant="outline">
                {t}
              </Badge>
            ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onLogAnother} variant="outline" className="h-12 flex-1">
          Log another
        </Button>
        <Link
          href="/dashboard"
          className="flex h-12 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
        >
          View dashboard
        </Link>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Informational only — not medical advice.
      </p>
    </div>
  );
}
