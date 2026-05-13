"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SPORTS,
  SPORT_LABELS,
  type Athlete,
  type Sport,
} from "@/lib/types";
import { saveAthlete } from "./actions";

const tile =
  "rounded-xl border-2 text-base font-medium transition active:scale-[0.98]";
const tileIdle = "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300";
const tileActive = "border-zinc-900 bg-zinc-900 text-white shadow-sm";

export function AthleteForm({
  athlete,
  next,
  errorMessage,
}: {
  athlete: Athlete | null;
  next?: string;
  errorMessage?: string;
}) {
  const [sport, setSport] = useState<Sport | null>(athlete?.sport ?? null);

  return (
    <form action={saveAthlete} className="space-y-8">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="sport" value={sport ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={athlete?.full_name ?? ""}
          placeholder="Jane Doe"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        />
      </div>

      <Section label="Sport">
        <div className="grid grid-cols-2 gap-3">
          {SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(s)}
              className={`${tile} h-20 ${sport === s ? tileActive : tileIdle}`}
            >
              {SPORT_LABELS[s]}
            </button>
          ))}
        </div>
      </Section>

      <div className="space-y-2">
        <Label htmlFor="weight_class">Weight class (optional)</Label>
        <input
          id="weight_class"
          name="weight_class"
          type="text"
          defaultValue={athlete?.weight_class ?? ""}
          placeholder="e.g. 175 lbs, Heavyweight, OL"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        />
        <p className="text-xs text-zinc-500">
          Used to scale Peak G estimates — &ldquo;heavyweight&rdquo; and weights
          ≥200 lbs / 90 kg trigger a 1.2× scalar.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseline_threshold">
          Baseline HIT<sub>sp</sub> threshold
        </Label>
        <input
          id="baseline_threshold"
          name="baseline_threshold"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={athlete?.baseline_threshold ?? 1000}
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        />
        <p className="text-xs text-zinc-500">
          The cumulative HIT<sub>sp</sub> ceiling at which the system flags
          mandatory rest. Default 1000 — tune to the athlete&apos;s tolerance.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <SubmitButton
        disabled={!sport}
        label={athlete ? "Update athlete" : "Create athlete"}
      />
    </form>
  );
}

function SubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      className="h-12 w-full text-base"
    >
      {pending ? "Saving..." : label}
    </Button>
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
