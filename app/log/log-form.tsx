"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ZONES,
  INTENSITIES,
  FEELINGS,
  ACTIVITIES,
  type Zone,
  type Intensity,
  type Feeling,
  type Activity,
  type ImpactLog,
} from "@/lib/types";
import { ResultView } from "./result-view";

const tile =
  "h-16 rounded-xl border-2 text-base font-medium transition active:scale-[0.98]";
const tileIdle = "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300";
const tileActive = "border-zinc-900 bg-zinc-900 text-white shadow-sm";

export function LogForm() {
  const [pending, startTransition] = useTransition();

  const [zone, setZone] = useState<Zone | null>(null);
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImpactLog | null>(null);

  const toggleFeeling = (f: Feeling) => {
    setFeelings((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const canSubmit = zone !== null && intensity !== null && activity !== null;

  const reset = () => {
    setZone(null);
    setIntensity(null);
    setFeelings([]);
    setActivity(null);
    setNotes("");
    setError(null);
    setResult(null);
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: { zone, intensity, feelings, activity },
          raw_text: notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Submission failed");
        return;
      }
      setResult(data.log as ImpactLog);
    });
  };

  if (result) {
    return <ResultView log={result} onLogAnother={reset} />;
  }

  return (
    <div className="space-y-8">
      <Section label="Zone of impact">
        <Grid cols={2}>
          {ZONES.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZone(z)}
              className={`${tile} ${zone === z ? tileActive : tileIdle}`}
            >
              {z}
            </button>
          ))}
        </Grid>
      </Section>

      <Section label="Intensity">
        <Grid cols={3}>
          {INTENSITIES.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIntensity(i)}
              className={`${tile} ${intensity === i ? tileActive : tileIdle}`}
            >
              {i}
            </button>
          ))}
        </Grid>
      </Section>

      <Section label="How do you feel? (select all that apply)">
        <Grid cols={2}>
          {FEELINGS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFeeling(f)}
              className={`${tile} ${feelings.includes(f) ? tileActive : tileIdle}`}
            >
              {f}
            </button>
          ))}
        </Grid>
      </Section>

      <Section label="Activity">
        <Grid cols={3}>
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setActivity(a)}
              className={`${tile} ${activity === a ? tileActive : tileIdle}`}
            >
              {a}
            </button>
          ))}
        </Grid>
      </Section>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else? e.g. 'got my bell rung in round 3, saw stars'"
        />
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || pending}
        className="h-14 w-full text-base"
      >
        {pending ? "Submitting..." : "Submit Log"}
      </Button>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-600">{label}</h2>
      {children}
    </div>
  );
}

function Grid({
  cols,
  children,
}: {
  cols: 2 | 3;
  children: React.ReactNode;
}) {
  const c = cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return <div className={`grid ${c} gap-3`}>{children}</div>;
}
