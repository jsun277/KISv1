"use client";

import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IMPACT_TYPE_LABELS,
  type ImpactLog,
  type SeverityColor,
} from "@/lib/types";

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

        {log.analysis.est_peak_g != null ||
        log.analysis.hit_sp_contribution != null ? (
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                <Gauge className="size-3.5" aria-hidden />
                Est. Peak G
              </div>
              <div className={`mt-0.5 text-lg font-semibold ${t.text}`}>
                {log.analysis.est_peak_g ?? "—"}
                <span className="text-xs font-normal text-zinc-500"> g</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                HIT<sub>sp</sub> contribution
              </div>
              <div className={`mt-0.5 text-lg font-semibold ${t.text}`}>
                {log.analysis.hit_sp_contribution != null
                  ? log.analysis.hit_sp_contribution.toFixed(1)
                  : "—"}
              </div>
            </div>
          </div>
        ) : null}
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
            log.impact_type ? IMPACT_TYPE_LABELS[log.impact_type] : null,
            ...(log.tags.feelings ?? []),
          ]
            .filter(Boolean)
            .map((tag) => (
              <Badge key={tag as string} variant="outline">
                {tag}
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

      <div className="flex items-start gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {log.analysis.disclaimer ??
            "Informational only — not medical advice."}
        </span>
      </div>
    </div>
  );
}
