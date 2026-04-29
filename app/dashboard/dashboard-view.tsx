"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ImpactLog, SeverityColor } from "@/lib/types";
import { deleteLog } from "./actions";

const severityStyles: Record<
  SeverityColor,
  { border: string; text: string; bg: string; label: string; tone: string }
> = {
  Green: {
    border: "border-l-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    label: "Status: Normal",
    tone: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  },
  Yellow: {
    border: "border-l-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    label: "Caution: Monitor symptoms",
    tone: "bg-amber-100 text-amber-900 hover:bg-amber-200",
  },
  Red: {
    border: "border-l-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    label: "Caution: High Impact Detected",
    tone: "bg-red-100 text-red-900 hover:bg-red-200",
  },
};

const SEVERITY_RANK: Record<SeverityColor, number> = {
  Green: 0,
  Yellow: 1,
  Red: 2,
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

export function DashboardView({ logs }: { logs: ImpactLog[] }) {
  const router = useRouter();
  const today = new Date();
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const byDate = useMemo(() => {
    const m = new Map<string, ImpactLog[]>();
    for (const log of logs) {
      const k = dateKey(new Date(log.created_at));
      const arr = m.get(k);
      if (arr) arr.push(log);
      else m.set(k, [log]);
    }
    return m;
  }, [logs]);

  const stats = useMemo(() => computeStats(logs, today), [logs]);

  const cells = useMemo(
    () => buildMonthCells(view.year, view.month),
    [view],
  );

  const latest = logs[0];
  const visibleLogs = selected ? (byDate.get(selected) ?? []) : logs;
  const todayKey = dateKey(today);

  const onDelete = (id: string) => {
    if (!confirm("Delete this log?")) return;
    setDeletingId(id);
    startDelete(async () => {
      await deleteLog(id);
      setDeletingId(null);
      router.refresh();
    });
  };

  const goPrev = () =>
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { year: v.year, month: v.month - 1 },
    );
  const goNext = () =>
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { year: v.year, month: v.month + 1 },
    );
  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(null);
  };

  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500">Your impact history.</p>
        </div>
        <Link href="/log" className={buttonVariants({ size: "sm" })}>
          + New log
        </Link>
      </div>

      <StatusCard latest={latest} />

      <StatsStrip stats={stats} />

      <TrendCard logs={logs} />

      <CalendarCard
        view={view}
        cells={cells}
        byDate={byDate}
        todayKey={todayKey}
        selected={selected}
        onSelect={(k) => setSelected((p) => (p === k ? null : k))}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onClear={() => setSelected(null)}
      />

      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-medium text-zinc-600">
          {selected ? `Logs on ${formatDay(selected)}` : "History"}
        </h2>
        {visibleLogs.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500">
            {selected ? (
              "No logs on this day."
            ) : (
              <>
                No logs yet.{" "}
                <Link
                  href="/log"
                  className="font-medium text-zinc-900 underline"
                >
                  Submit your first
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleLogs.map((log) => (
              <LogCard
                key={log.id}
                log={log}
                onDelete={onDelete}
                isDeleting={deletingId === log.id}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StatusCard({ latest }: { latest: ImpactLog | undefined }) {
  if (!latest) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white px-5 py-6">
        <div className="text-sm text-zinc-500">Current status</div>
        <div className="mt-1 text-xl font-semibold text-zinc-900">
          No logs yet
        </div>
      </div>
    );
  }
  const s = severityStyles[latest.analysis.severity_color];
  return (
    <div
      className={`rounded-lg border border-zinc-200 border-l-4 ${s.border} ${s.bg} px-5 py-6`}
    >
      <div className="text-sm text-zinc-500">Current status</div>
      <div className={`mt-1 text-xl font-semibold ${s.text}`}>{s.label}</div>
      <div className="mt-3 text-sm text-zinc-700">
        {latest.analysis.insight}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
        <span>Risk score: {latest.analysis.risk_score}/10</span>
        <span>·</span>
        <span>{formatDateTime(latest.created_at)}</span>
      </div>
    </div>
  );
}

function StatsStrip({ stats }: { stats: Stats }) {
  const items: { label: string; value: string; sub?: string }[] = [
    {
      label: "Total logs",
      value: String(stats.total),
      sub: stats.thisMonth ? `${stats.thisMonth} this month` : undefined,
    },
    {
      label: "Avg score (30d)",
      value: stats.avg30d != null ? stats.avg30d.toFixed(1) : "—",
      sub: "/ 10",
    },
    {
      label: "Red days (30d)",
      value: String(stats.redDays30d),
    },
    {
      label: "Last log",
      value:
        stats.daysSinceLast == null
          ? "—"
          : stats.daysSinceLast === 0
            ? "Today"
            : `${stats.daysSinceLast}d ago`,
    },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-3"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {it.label}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-semibold text-zinc-900">
              {it.value}
            </span>
            {it.sub ? (
              <span className="text-xs text-zinc-500">{it.sub}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendCard({ logs }: { logs: ImpactLog[] }) {
  const data = useMemo(() => {
    return [...logs]
      .reverse()
      .slice(-30)
      .map((l) => ({
        ts: new Date(l.created_at).getTime(),
        score: l.analysis.risk_score,
        date: new Date(l.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        color: l.analysis.severity_color,
      }));
  }, [logs]);

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Risk trend</h2>
        <span className="text-xs text-zinc-500">last {data.length} logs</span>
      </div>
      {data.length < 2 ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
          Need at least 2 logs to show a trend.
        </div>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="#e4e4e7"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#71717a" }}
                stroke="#e4e4e7"
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 4, 7, 10]}
                tick={{ fontSize: 10, fill: "#71717a" }}
                stroke="#e4e4e7"
                width={28}
              />
              <ReferenceLine
                y={4}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
              <ReferenceLine
                y={7}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                }}
                formatter={(v) => [`${v}/10`, "Risk"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#18181b"
                strokeWidth={2}
                dot={{ r: 3, fill: "#18181b" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function CalendarCard({
  view,
  cells,
  byDate,
  todayKey,
  selected,
  onSelect,
  onPrev,
  onNext,
  onToday,
  onClear,
}: {
  view: { year: number; month: number };
  cells: { date: Date; key: string; inMonth: boolean }[];
  byDate: Map<string, ImpactLog[]>;
  todayKey: string;
  selected: string | null;
  onSelect: (key: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onClear: () => void;
}) {
  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">
            {MONTH_NAMES[view.month]} {view.year}
          </h2>
          <button
            type="button"
            onClick={onToday}
            className="rounded-md px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="pb-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayLogs = byDate.get(cell.key) ?? [];
          const sev = maxSeverity(dayLogs);
          const isSelected = selected === cell.key;
          const isToday = cell.key === todayKey;
          const hasLogs = dayLogs.length > 0;

          const base =
            "relative aspect-square w-full rounded-md text-sm flex flex-col items-center justify-center transition";
          const inMonth = cell.inMonth ? "" : "opacity-30";
          const tone = sev
            ? severityStyles[sev].tone
            : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100";
          const ring = isSelected
            ? "ring-2 ring-zinc-900"
            : isToday
              ? "ring-1 ring-zinc-400"
              : "";

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!hasLogs}
              onClick={() => onSelect(cell.key)}
              className={`${base} ${tone} ${ring} ${inMonth} ${
                hasLogs ? "cursor-pointer" : "cursor-default"
              }`}
              aria-label={`${cell.key}${
                hasLogs ? ` — ${dayLogs.length} log(s)` : ""
              }`}
            >
              <span className={isToday ? "font-semibold" : ""}>
                {cell.date.getDate()}
              </span>
              {dayLogs.length > 1 ? (
                <span className="absolute right-1 top-1 text-[10px] font-medium opacity-70">
                  {dayLogs.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <Legend tone="bg-emerald-100" label="Green" />
          <Legend tone="bg-amber-100" label="Yellow" />
          <Legend tone="bg-red-100" label="Red" />
        </div>
        {selected ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100"
          >
            Clear filter
          </button>
        ) : null}
      </div>
    </section>
  );
}

function LogCard({
  log,
  onDelete,
  isDeleting,
}: {
  log: ImpactLog;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const s = severityStyles[log.analysis.severity_color];
  const tagPills = [
    log.tags.zone,
    log.tags.intensity,
    log.tags.activity,
    ...(log.tags.feelings ?? []),
  ].filter(Boolean) as string[];

  return (
    <li
      className={`rounded-lg border border-zinc-200 border-l-4 ${s.border} bg-white px-4 py-3 ${
        isDeleting ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-zinc-500">
            {formatDateTime(log.created_at)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tagPills.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-sm font-semibold ${s.text}`}>
            {log.analysis.risk_score}/10
          </div>
          <button
            type="button"
            onClick={() => onDelete(log.id)}
            disabled={isDeleting}
            className="rounded-md px-1.5 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
            aria-label="Delete log"
            title="Delete log"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 text-sm text-zinc-700">{log.analysis.insight}</div>
      {log.analysis.symptoms.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {log.analysis.symptoms.map((sym) => (
            <Badge key={sym} variant="outline" className="text-xs">
              {sym}
            </Badge>
          ))}
        </div>
      ) : null}
      {log.raw_text ? (
        <p className="mt-2 text-xs italic text-zinc-500">
          &ldquo;{log.raw_text}&rdquo;
        </p>
      ) : null}
    </li>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${tone}`} />
      <span>{label}</span>
    </div>
  );
}

type Stats = {
  total: number;
  thisMonth: number;
  avg30d: number | null;
  redDays30d: number;
  daysSinceLast: number | null;
};

function computeStats(logs: ImpactLog[], now: Date): Stats {
  if (logs.length === 0) {
    return {
      total: 0,
      thisMonth: 0,
      avg30d: null,
      redDays30d: 0,
      daysSinceLast: null,
    };
  }
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  let thisMonth = 0;
  let sum30 = 0;
  let count30 = 0;
  const redDays = new Set<string>();

  for (const l of logs) {
    const t = new Date(l.created_at).getTime();
    if (t >= startOfMonth) thisMonth++;
    if (t >= thirtyDaysAgo) {
      sum30 += l.analysis.risk_score;
      count30++;
      if (l.analysis.severity_color === "Red") {
        redDays.add(dateKey(new Date(l.created_at)));
      }
    }
  }

  const latestTs = new Date(logs[0].created_at).getTime();
  const daysSinceLast = Math.floor(
    (now.getTime() - latestTs) / (24 * 60 * 60 * 1000),
  );

  return {
    total: logs.length,
    thisMonth,
    avg30d: count30 > 0 ? sum30 / count30 : null,
    redDays30d: redDays.size,
    daysSinceLast,
  };
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; key: string; inMonth: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, key: dateKey(d), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, key: dateKey(date), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: d, key: dateKey(d), inMonth: false });
  }
  return cells;
}

function maxSeverity(logs: ImpactLog[]): SeverityColor | null {
  if (logs.length === 0) return null;
  let worst: SeverityColor = "Green";
  for (const l of logs) {
    if (SEVERITY_RANK[l.analysis.severity_color] > SEVERITY_RANK[worst]) {
      worst = l.analysis.severity_color;
    }
  }
  return worst;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
