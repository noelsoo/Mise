"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { ProfileRow } from "@/lib/supabase/database.types";
import type { ProfileState } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ProfileForm({ profile, action, submitLabel, onboarding }: {
  profile: ProfileRow; action: (s: ProfileState, f: FormData) => Promise<ProfileState>; submitLabel: string; onboarding?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [units, setUnits] = useState(profile.units);
  const [kcal, setKcal] = useState<string>(profile.kcal_target?.toString() ?? "");
  return (
    <form action={formAction} className="space-y-5">
      {!onboarding ? (
        <Card className="p-5">
          <Field label="Display name" htmlFor="display_name">
            <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} maxLength={80} autoComplete="nickname" />
          </Field>
        </Card>
      ) : <input type="hidden" name="display_name" value={profile.display_name ?? ""} />}

      <Card className="p-5">
        <h2 className="text-xl">Measurement standard</h2>
        <input type="hidden" name="units" value={units} />
        <div role="radiogroup" aria-label="Units" className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-1">
          {([["metric", "Metric", "g, ml"], ["us", "US", "oz, cups"]] as const).map(([v, l, s]) => (
            <button type="button" role="radio" aria-checked={units === v} key={v} onClick={() => setUnits(v)}
              className={cn("min-h-14 rounded-md px-3 py-2 text-center", units === v ? "bg-primary text-on-primary" : "text-ink")}>
              <span className="block font-semibold">{l}</span><span className="text-xs opacity-80">{s}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl">Weekly planning</h2>
        <div className="mt-4">
          <Field label="Week starts on" htmlFor="week_start">
            <Select id="week_start" name="week_start" defaultValue={profile.week_start}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl">Daily targets</h2>
          <span className="text-sm text-ink-muted">Optional</span>
        </div>
        <div className="mt-4">
          <Field label="Energy (kcal per day)" htmlFor="kcal_target">
            <Input id="kcal_target" name="kcal_target" type="number" inputMode="numeric" min={500} max={10000} step={50} value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="e.g. 2000" />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {([["protein_target", "Protein (g)", "text-protein", profile.protein_target], ["carbs_target", "Carbs (g)", "text-carbs-ink", profile.carbs_target], ["fat_target", "Fat (g)", "text-fat", profile.fat_target]] as const).map(([n, l, c, v]) => (
            <Field key={n} label={l} htmlFor={n}>
              <Input id={n} name={n} type="number" inputMode="numeric" min={0} max={2000} defaultValue={v ?? ""} className={cn("tnum font-semibold", c)} />
            </Field>
          ))}
        </div>
      </Card>

      {state?.error ? <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      {state?.saved ? <p role="status" className="rounded-md bg-primary-soft px-4 py-3 text-sm text-primary">Saved.</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
