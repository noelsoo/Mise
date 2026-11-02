"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { useUndoableDelete } from "@/components/ui/toast";
import { addCustomFood, deleteCustomFood } from "@/lib/actions/foods";
import type { CustomFoodRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export function CustomFoods({ foods }: { foods: CustomFoodRow[] }) {
  const [state, action, pending] = useActionState(addCustomFood, {});
  const [basis, setBasis] = useState<"100g" | "serving">("100g");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const undo = useUndoableDelete();
  useEffect(() => { if (state.ok) formRef.current?.reset(); }, [state]);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-xl">Add from a packet label</h2>
        <form ref={formRef} action={action} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="name"><Input id="name" name="name" required maxLength={120} placeholder="Wholemeal wraps" /></Field>
            <Field label="Brand (optional)" htmlFor="brand"><Input id="brand" name="brand" maxLength={80} /></Field>
          </div>
          <input type="hidden" name="basis" value={basis} />
          <div role="radiogroup" aria-label="Label values are" className="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-1">
            {([["100g", "Per 100 g"], ["serving", "Per serving"]] as const).map(([v, l]) => (
              <button type="button" key={v} role="radio" aria-checked={basis === v} onClick={() => setBasis(v)}
                className={cn("min-h-11 rounded-md text-sm font-semibold", basis === v ? "bg-surface shadow-1 text-primary" : "text-ink-muted")}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label={basis === "serving" ? "Serving size (g)" : "Serving size (g, optional)"} htmlFor="serving_g"><Input id="serving_g" name="serving_g" type="number" step="any" min={0} required={basis === "serving"} /></Field>
            <Field label="Energy (kcal)" htmlFor="kcal"><Input id="kcal" name="kcal" type="number" step="any" min={0} required /></Field>
            <Field label="Protein (g)" htmlFor="protein_g"><Input id="protein_g" name="protein_g" type="number" step="any" min={0} /></Field>
            <Field label="Carbs (g)" htmlFor="carbs_g"><Input id="carbs_g" name="carbs_g" type="number" step="any" min={0} /></Field>
            <Field label="Fat (g)" htmlFor="fat_g"><Input id="fat_g" name="fat_g" type="number" step="any" min={0} /></Field>
            <Field label="Saturated fat (g)" htmlFor="sat_fat_g"><Input id="sat_fat_g" name="sat_fat_g" type="number" step="any" min={0} /></Field>
            <Field label="Fibre (g)" htmlFor="fibre_g"><Input id="fibre_g" name="fibre_g" type="number" step="any" min={0} /></Field>
            <Field label="Sugar (g)" htmlFor="sugar_g"><Input id="sugar_g" name="sugar_g" type="number" step="any" min={0} /></Field>
            <Field label="Sodium (mg)" htmlFor="sodium_mg"><Input id="sodium_mg" name="sodium_mg" type="number" step="any" min={0} /></Field>
          </div>
          {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
          {state.ok ? <p role="status" className="text-sm text-primary">Saved. Recipes that mention it will match it on their next save.</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save food"}</Button>
        </form>
      </Card>

      {foods.filter((f) => !hidden.has(f.id)).length ? (
        <Card className="divide-y divide-border">
          {foods.filter((f) => !hidden.has(f.id)).map((f) => (
            <div key={f.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="flex-1"><span className="block font-semibold">{f.name}{f.brand ? <span className="font-normal text-ink-muted"> · {f.brand}</span> : null}</span>
                <span className="text-sm text-ink-muted tnum">Per 100 g: {Math.round(f.kcal)} kcal · P {f.protein_g} g · C {f.carbs_g} g · F {f.fat_g} g</span></span>
              <Button variant="quiet" size="icon" aria-label={`Delete ${f.name}`} onClick={() => undo({
                message: `Deleted ${f.name}.`,
                hide: () => setHidden((h) => new Set(h).add(f.id)),
                restore: () => setHidden((h) => { const n = new Set(h); n.delete(f.id); return n; }),
                commit: async () => { const r = await deleteCustomFood(f.id); if (!r.ok) return { error: r.error }; },
              })}><Trash2 /></Button>
            </div>
          ))}
        </Card>
      ) : <EmptyState title="No custom foods yet" body="Add foods that aren't in the USDA list, such as a branded sauce or bread, straight from the label." />}
    </div>
  );
}
