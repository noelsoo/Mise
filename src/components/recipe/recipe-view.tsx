"use client";
import { useState, useTransition } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, MacroPill, Pill } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { IngredientRow, RecipeRow, StepRow } from "@/lib/supabase/database.types";
import { fixIngredient, searchFoods } from "@/lib/actions/recipes";
import { setUnits } from "@/lib/actions/profile";
import { formatQuantity, normaliseUnit, toFraction } from "@/lib/units";
import { cn } from "@/lib/utils";

type System = "metric" | "us";

/** Display a scaled quantity. Spoons stay as spoons in metric (that's how people measure). */
export function displayQuantity(q: number | null, q2: number | null, unit: string | null, factor: number, system: System): string {
  if (q == null) return "";
  const canon = normaliseUnit(unit);
  const keep = system === "metric" && (canon === "tsp" || canon === "tbsp");
  const one = (n: number) => (canon && !keep ? formatQuantity(n * factor, canon, system) : `${toFraction(n * factor)}${unit ? ` ${unit}` : ""}`);
  if (q2 != null && q2 !== q) {
    const a = one(q), b = one(q2);
    return `${a.split(" ")[0]}–${b}`;
  }
  return one(q);
}

export function RecipeView({ recipe, ingredients, steps, foodNames, units, readOnly }: {
  recipe: RecipeRow; ingredients: IngredientRow[]; steps: StepRow[]; foodNames: Record<string, string>; units: System; readOnly?: boolean;
}) {
  const base = Number(recipe.servings);
  const [servings, setServings] = useState(base);
  const [system, setSystem] = useState<System>(units);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [fixing, setFixing] = useState<IngredientRow | null>(null);
  const factor = servings / base;
  const partial = recipe.counted_count < recipe.ingredient_count;
  const step = base < 2 ? 0.5 : 1;

  const changeSystem = (s: System) => { setSystem(s); if (!readOnly) void setUnits(s); };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl text-accent tnum">{recipe.kcal == null ? "–" : `${partial ? "≥ " : ""}${Math.round(recipe.kcal)}`}</span>
            <span className="text-ink-muted">kcal per serving</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <MacroPill macro="protein" grams={recipe.protein_g} partial={partial} />
            <MacroPill macro="carbs" grams={recipe.carbs_g} partial={partial} />
            <MacroPill macro="fat" grams={recipe.fat_g} partial={partial} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {([["Fibre", recipe.fibre_g, "g"], ["Sugar", recipe.sugar_g, "g"], ["Saturated fat", recipe.sat_fat_g, "g"], ["Sodium", recipe.sodium_mg, "mg"]] as const).map(([l, v, u]) => (
              <div key={l} className="flex justify-between border-b border-border py-1.5"><dt className="text-ink-muted">{l}</dt><dd className="font-semibold tnum">{v == null ? "–" : `${partial ? "≥" : ""}${v} ${u}`}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-ink-muted">
            <span className="font-semibold text-ink tnum">{recipe.counted_count} of {recipe.ingredient_count}</span> ingredients counted.
            {partial ? " Totals are “at least” until the rest are matched." : " USDA SR Legacy data."}
          </p>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-1" role="group" aria-label="Servings">
            <Button variant="ghost" size="icon" aria-label="Fewer servings" disabled={servings <= step} onClick={() => setServings((s) => Math.max(step, s - step))}><Minus /></Button>
            <span className="min-w-24 text-center font-semibold tnum" aria-live="polite">{servings} serving{servings === 1 ? "" : "s"}</span>
            <Button variant="ghost" size="icon" aria-label="More servings" disabled={servings >= 100} onClick={() => setServings((s) => Math.min(100, s + step))}><Plus /></Button>
          </div>
          <div role="radiogroup" aria-label="Units" className="flex rounded-md bg-surface-muted p-1">
            {(["metric", "us"] as const).map((s) => (
              <button key={s} role="radio" aria-checked={system === s} onClick={() => changeSystem(s)}
                className={cn("min-h-11 rounded-md px-4 text-sm font-semibold", system === s ? "bg-surface shadow-1 text-primary" : "text-ink-muted")}>
                {s === "metric" ? "Metric" : "US"}
              </button>
            ))}
          </div>
        </Card>

        <section aria-labelledby="ing-h">
          <div className="flex items-baseline justify-between">
            <h2 id="ing-h" className="text-2xl">Ingredients <span className="text-base text-ink-muted tnum">({ingredients.length})</span></h2>
            <span className="text-sm text-ink-muted">Tap to tick off</span>
          </div>
          <Card className="mt-3 divide-y divide-border">
            {ingredients.map((ing, i) => {
              const header = ing.group_name && ing.group_name !== ingredients[i - 1]?.group_name ? ing.group_name : null;
              const done = ticked.has(ing.id);
              const qty = displayQuantity(ing.quantity, ing.quantity2, ing.unit, factor, system);
              return (
                <div key={ing.id}>
                  {header ? <p className="label-caps bg-surface-muted px-4 py-2 text-ink-muted">{header}</p> : null}
                  <div className="flex min-h-12 items-center gap-3 px-4 py-2">
                    <Checkbox aria-label={`Tick off ${ing.name || ing.raw}`} checked={done} onChange={() => setTicked((t) => { const n = new Set(t); if (n.has(ing.id)) n.delete(ing.id); else n.add(ing.id); return n; })} />
                    <span className={cn("flex-1 transition", done && "line-through opacity-50")}>
                      {ing.quantity == null ? ing.raw : <>{ing.name}{ing.note ? <span className="text-ink-muted">, {ing.note}</span> : null}</>}
                    </span>
                    {qty ? <span className="text-sm text-ink-muted tnum">{qty}</span> : null}
                    {readOnly ? null : (
                      <button onClick={() => setFixing(ing)} className="min-h-11 shrink-0" aria-label={`${ing.counted ? "Counted" : "Not counted"}: change match for ${ing.name || ing.raw}`}>
                        <Pill className={ing.counted ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent-ink"}>{ing.counted ? "counted" : "fix"}</Pill>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!ingredients.length ? <p className="p-4 text-ink-muted">No ingredients yet.</p> : null}
          </Card>
        </section>
      </div>

      <section aria-labelledby="steps-h">
        <h2 id="steps-h" className="text-2xl">Method</h2>
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => {
            const header = s.group_name && s.group_name !== steps[i - 1]?.group_name ? s.group_name : null;
            return (
              <li key={s.id}>
                {header ? <p className="label-caps mb-2 text-ink-muted">{header}</p> : null}
                <Card className="flex gap-4 p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-semibold text-on-primary tnum" aria-hidden>{i + 1}</span>
                  <p className="text-[18px] leading-7"><span className="sr-only">Step {i + 1}: </span>{s.text}</p>
                </Card>
              </li>
            );
          })}
          {!steps.length ? <p className="text-ink-muted">No steps yet.</p> : null}
        </ol>
        {recipe.notes ? <Card className="mt-5 bg-surface-muted p-4"><h3 className="text-lg">Notes</h3><p className="mt-1 whitespace-pre-line">{recipe.notes}</p></Card> : null}
      </section>

      {fixing ? <FixDialog ing={fixing} current={fixing.food_id ? foodNames[`f${fixing.food_id}`] : fixing.custom_food_id ? foodNames[`c${fixing.custom_food_id}`] : undefined} onClose={() => setFixing(null)} /> : null}
    </div>
  );
}

function FixDialog({ ing, current, onClose }: { ing: IngredientRow; current?: string; onClose: () => void }) {
  const [q, setQ] = useState(ing.name);
  const [results, setResults] = useState<{ foods: { id: number; name: string; food_group: string; kcal: number }[]; custom: { id: string; name: string; brand: string | null; kcal: number }[] } | null>(null);
  const [grams, setGrams] = useState(ing.grams?.toString() ?? "");
  const [remember, setRemember] = useState(true);
  const [pending, start] = useTransition();
  const { show } = useToast();

  const run = (pick: { foodId: number | null; customFoodId: string | null }, useGrams: boolean) =>
    start(async () => {
      const g = useGrams && grams !== "" ? Number(grams) : null;
      const res = await fixIngredient({ ingredientId: ing.id, ...pick, grams: g, remember });
      if (!res.ok) show({ message: res.error, tone: "error" }); else { show({ message: "Match updated." }); onClose(); }
    });

  return (
    <Dialog open onClose={onClose} title="Fix this ingredient">
      <p className="font-semibold">{ing.raw}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {current ? <>Matched to <span className="text-ink">{current}</span>{ing.grams != null ? <>, weighed as <span className="tnum">{ing.grams} g</span></> : ", but no weight was found"}.</> : "Not matched to a food yet."}
      </p>

      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => setResults(await searchFoods(q))); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search foods" placeholder="Search USDA foods" />
        <Button type="submit" size="icon" aria-label="Search" disabled={pending}><Search /></Button>
      </form>

      <div className="mt-3">
        <label className="text-sm font-semibold" htmlFor="grams">Weight in grams (optional)</label>
        <Input id="grams" type="number" inputMode="decimal" min={0} max={100000} value={grams} onChange={(e) => setGrams(e.target.value)} className="mt-1" placeholder="Leave blank to use portion weights" />
        <p className="mt-1 text-xs text-ink-muted">Enter grams if the amount is in a unit we can&apos;t convert (e.g. “1 bunch”).</p>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember this match for “{ing.name}”</label>

      {results ? (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {results.custom.map((c) => (
            <li key={c.id}><button disabled={pending} onClick={() => run({ foodId: null, customFoodId: c.id }, true)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-muted">
              <span><span className="block">{c.name}{c.brand ? ` (${c.brand})` : ""}</span><span className="text-xs text-ink-muted">Your custom food</span></span><span className="text-sm tnum text-ink-muted">{Math.round(c.kcal)} kcal/100 g</span></button></li>
          ))}
          {results.foods.map((f) => (
            <li key={f.id}><button disabled={pending} onClick={() => run({ foodId: f.id, customFoodId: null }, true)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-muted">
              <span><span className="block">{f.name}</span><span className="text-xs text-ink-muted">{f.food_group}</span></span><span className="shrink-0 text-sm tnum text-ink-muted">{f.kcal == null ? "–" : Math.round(f.kcal)} kcal/100 g</span></button></li>
          ))}
          {!results.foods.length && !results.custom.length ? <li className="p-3 text-sm text-ink-muted">No foods found. Add it as a custom food under Me.</li> : null}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {(ing.food_id || ing.custom_food_id) && grams !== "" ? <Button variant="ghost" disabled={pending} onClick={() => run({ foodId: ing.food_id, customFoodId: ing.custom_food_id }, true)}>Save weight only</Button> : null}
        <Button variant="ghost" disabled={pending} onClick={() => run({ foodId: null, customFoodId: null }, false)}>Don&apos;t count this</Button>
      </div>
    </Dialog>
  );
}
