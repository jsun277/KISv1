"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SPORTS,
  SPORT_LABELS,
  SUB_TYPE_LABELS,
  SUB_TYPES_BY_SPORT,
  type Profile,
  type Sport,
  type SubType,
} from "@/lib/types";
import { saveProfile } from "./actions";

const tile =
  "rounded-xl border-2 text-base font-medium transition active:scale-[0.98]";
const tileIdle = "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300";
const tileActive = "border-zinc-900 bg-zinc-900 text-white shadow-sm";

export function ProfileForm({
  profile,
  next,
  errorMessage,
}: {
  profile: Profile | null;
  next?: string;
  errorMessage?: string;
}) {
  const [sport, setSport] = useState<Sport | null>(profile?.sport ?? null);
  const [subType, setSubType] = useState<SubType | null>(
    profile?.sub_type ?? null,
  );

  const validSubTypes = sport ? SUB_TYPES_BY_SPORT[sport] : [];
  const subTypeValid =
    subType !== null && validSubTypes.includes(subType);

  const onPickSport = (s: Sport) => {
    setSport(s);
    if (subType && !SUB_TYPES_BY_SPORT[s].includes(subType)) {
      setSubType(null);
    }
  };

  return (
    <form action={saveProfile} className="space-y-8">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="sport" value={sport ?? ""} />
      <input type="hidden" name="sub_type" value={subType ?? ""} />

      <Section label="Sport">
        <div className="grid grid-cols-2 gap-3">
          {SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPickSport(s)}
              className={`${tile} h-20 ${sport === s ? tileActive : tileIdle}`}
            >
              {SPORT_LABELS[s]}
            </button>
          ))}
        </div>
      </Section>

      {sport ? (
        <Section label="Primary context">
          <div className="grid grid-cols-3 gap-3">
            {validSubTypes.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSubType(st)}
                className={`${tile} h-16 px-2 text-sm ${
                  subType === st ? tileActive : tileIdle
                }`}
              >
                {SUB_TYPE_LABELS[st]}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="weight_class">Weight class (optional)</Label>
        <input
          id="weight_class"
          name="weight_class"
          type="text"
          defaultValue={profile?.weight_class ?? ""}
          placeholder="e.g. 175 lbs, Heavyweight, OL"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        />
      </div>

      {errorMessage ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <SubmitButton
        disabled={!sport || !subTypeValid}
        label={profile ? "Update profile" : "Save profile"}
      />

      <p className="text-center text-xs text-zinc-400">
        Sport context shapes how the agent reads your impacts. You can change it
        anytime.
      </p>
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
