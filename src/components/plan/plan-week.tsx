"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Copy, Minus, NotebookPen, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useToast, useUndoableDelete } from "@/components/ui/toast";
import { addPlanEntry, copyLastWeek, deletePlanEntry, updatePlanServings } from "@/lib/actions/plan";
import { publicImageUrl } from "@/lib/env";
import { shiftWeek } from "@/lib/week";
import { cn, parseLocalDate } from "@/lib/utils";

export type PlanEntry = {
  id: string; date: string; slot: Slot; servings: number | null; note: string | null; position: number; recipe_id: string | null;
  recipes: { id: string; title: string; photos: string[]; servings: number; kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; counted_count: number; ingredient_count: number } | null;
};
type Slot = "breakfast" | "lunch" | "dinner" | "snack";
const SLOTS: Slot[] = ["breakfast", "lunch", "dinner", "snack"];
type Targets = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };

function totalsFor(entries: PlanEntry[]) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, partial: false, any: false };
  for (const e of entries) {
    const r = e.recipes;
    if (!r) continue;
    const s = Number(e.servings ?? 1);
    if (r.kcal == null) { t.partial = true; continue; }
    t.any = true;
    t.kcal += r.kcal * s; t.protein += (r.protein_g ?? 0) * s; t.carbs += (r.carbs_g ?? 0) * s; t.fat += (r.fat_g ?? 0) * s;
    if (r.counted_count < r.ingredient_count) t.partial = true;
  }
  return t;
}

function Bar({ label, value, target, cls, unit = "g" }: { label: string; value: number; target: number | null; cls: string; unit?: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm"><span>{label}</span><span className="tnum"><span className="font-semibold">{Math.round(value)}</span>{target ? <span className="text-ink-muted">/{target}{unit}</span> : unit}</span></div>
      {target ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-high" role="meter" aria-label={`${label} ${Math.round(value)} of ${target}`} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={target}><div className={cn("h-full rounded-full", cls)} style={{ width: `${pct}%` }} /></div> : null}
    </div>
  );
}

export function PlanWeek({ start, days, today, initialDay, entries: initial, recipes, targets }: {
  start: string; days: string[]; today: string; initialDay: string; entries: PlanEntry[];
  recipes: { id: string; title: string; servings: number; kcal: number | null }[]; targets: Targets;
}) {
  const [entries, setEntries] = useState(initial);
  const [day, setDay] = useState(initialDay);
  const [adding, setAdding] = useState<{ date: string; slot: Slot } | null>(null);
  const [pending, start_] = useTransition();
  const router = useRouter();
  const { show } = useToast();
  const undo = useUndoableDelete();

  const byDay = useMemo(() => {
    const m = new Map<string, PlanEntry[]>();
    for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [entries]);
  const dayTotals = totalsFor(byDay.get(day) ?? []);
  const label = `${format(parseLocalDate(days[0]), "d MMM")} – ${format(parseLocalDate(days[6]), "d MMM")}`;

  const changeServings = (e: PlanEntry, delta: number) => {
    const next = Math.max(0.5, Math.min(100, Number(e.servings ?? 1) + delta));
    setEntries((all) => all.map((x) => (x.id === e.id ? { ...x, servings: next } : x)));
    start_(async () => { const r = await updatePlanServings(e.id, next); if (!r.ok) show({ message: r.error, tone: "error" }); });
  };

  const remove = (e: PlanEntry) => undo({
    message: `Removed ${e.recipes?.title ?? e.note}.`,
    hide: () => setEntries((all) => all.filter((x) => x.id !== e.id)),
    restore: () => setEntries((all) => [...all, e]),
    commit: async () => { const r = await deletePlanEntry(e.id); if (!r.ok) return { error: r.error }; },
  });

  const slotView = (date: string, slot: Slot, compact: boolean) => {
    const list = (byDay.get(date) ?? []).filter((e) => e.slot === slot);
    return (
      <div className={cn("rounded-lg border border-border bg-surface p-3", !list.length && "border-dashed bg-transparent")}>
        <div className="flex items-center justify-between">
          <p className="label-caps text-ink-muted">{slot}</p>
          <button onClick={() => setAdding({ date, slot })} aria-label={`Add to ${slot} on ${format(parseLocalDate(date), "EEEE d MMM")}`} className="grid size-11 place-items-center rounded-md text-primary hover:bg-surface-muted"><Plus className="size-5" /></button>
        </div>
        <ul className="space-y-2">
          {list.map((e) => (
            <li key={e.id} className="rounded-md bg-surface-muted p-2">
              {e.recipes ? (
                <div className="flex gap-2">
                  {!compact && e.recipes.photos[0] ? <div className="relative size-14 shrink-0 overflow-hidden rounded-md"><Image src={publicImageUrl(e.recipes.photos[0])} alt="" fill sizes="56px" className="object-cover" /></div> : null}
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${e.recipes.id}`} className="line-clamp-2 font-serif text-base leading-5 hover:underline">{e.recipes.title}</Link>
                    {e.recipes.kcal != null ? <p className="text-sm font-semibold text-accent tnum">{e.recipes.counted_count < e.recipes.ingredient_count ? "≥" : ""}{Math.round(e.recipes.kcal * Number(e.servings ?? 1))} kcal</p> : null}
                    <div className="mt-1 flex items-center gap-1">
                      <button aria-label="One serving fewer" onClick={() => changeServings(e, -0.5)} className="grid size-9 place-items-center rounded-md border border-border bg-surface"><Minus className="size-4" /></button>
                      <span className="min-w-16 text-center text-xs tnum">{Number(e.servings ?? 1)} serving{Number(e.servings) === 1 ? "" : "s"}</span>
                      <button aria-label="One serving more" onClick={() => changeServings(e, 0.5)} className="grid size-9 place-items-center rounded-md border border-border bg-surface"><Plus className="size-4" /></button>
                      <button aria-label={`Remove ${e.recipes.title}`} onClick={() => remove(e)} className="ml-auto grid size-9 place-items-center rounded-md text-ink-muted hover:text-danger"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2"><NotebookPen className="size-4 text-ink-muted" aria-hidden /><span className="flex-1 italic">{e.note}</span>
                  <button aria-label={`Remove note ${e.note}`} onClick={() => remove(e)} className="grid size-9 place-items-center rounded-md text-ink-muted hover:text-danger"><Trash2 className="size-4" /></button></div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Button asChild variant="quiet" size="icon" aria-label="Previous week"><Link href={`/plan?week=${shiftWeek(start, -1)}`}><ChevronLeft /></Link></Button>
        <h1 className="font-serif text-3xl">{label}</h1>
        <Button asChild variant="quiet" size="icon" aria-label="Next week"><Link href={`/plan?week=${shiftWeek(start, 1)}`}><ChevronRight /></Link></Button>
        {!days.includes(today) ? <Button asChild variant="ghost" size="sm"><Link href="/plan">This week</Link></Button> : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" disabled={pending} onClick={() => start_(async () => {
            const r = await copyLastWeek(start);
            if (r.ok) { show({ message: r.data!.copied ? `Copied ${r.data!.copied} meals from last week.` : "Last week is already copied." }); router.refresh(); }
            else show({ message: r.error, tone: "error" });
          })}><Copy aria-hidden /> Copy last week</Button>
          <Button asChild><Link href={`/groceries?from=${start}`}><ShoppingBasket aria-hidden /> Grocery list</Link></Button>
        </div>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">{format(parseLocalDate(day), "EEEE d MMM")}</p>
          <p><span className="font-serif text-3xl text-accent tnum">{dayTotals.partial && dayTotals.any ? "≥" : ""}{Math.round(dayTotals.kcal)}</span><span className="text-sm text-ink-muted"> {targets.kcal ? `/ ${targets.kcal} ` : ""}kcal</span></p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <Bar label="Protein" value={dayTotals.protein} target={targets.protein} cls="bg-protein" />
          <Bar label="Carbs" value={dayTotals.carbs} target={targets.carbs} cls="bg-carbs" />
          <Bar label="Fat" value={dayTotals.fat} target={targets.fat} cls="bg-fat" />
        </div>
        {!targets.kcal ? <p className="mt-2 text-xs text-ink-muted">Set daily targets under <Link href="/me" className="font-semibold text-primary">Me</Link> to track against them.</p> : null}
        {dayTotals.partial ? <p className="mt-2 text-xs text-ink-muted">Some planned recipes have uncounted ingredients, so these are minimums.</p> : null}
      </Card>

      <div className="mt-4 grid grid-cols-7 gap-1" role="tablist" aria-label="Day">
        {days.map((d) => {
          const has = (byDay.get(d) ?? []).length > 0;
          return (
            <button key={d} role="tab" aria-selected={d === day} onClick={() => setDay(d)}
              className={cn("flex min-h-16 flex-col items-center justify-center rounded-lg text-sm", d === day ? "bg-primary text-on-primary" : "bg-surface-muted", d === today && d !== day && "ring-2 ring-primary/40")}>
              <span>{format(parseLocalDate(d), "EEE")}</span><span className="font-semibold tnum">{format(parseLocalDate(d), "d")}</span>
              <span aria-hidden className={cn("mt-0.5 size-1.5 rounded-full", has ? (d === day ? "bg-on-primary" : "bg-primary") : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      {/* Mobile and tablet: one day at a time. Desktop: the whole week. */}
      <div className="mt-4 space-y-3 xl:hidden">{SLOTS.map((s) => <div key={s}>{slotView(day, s, false)}</div>)}</div>
      <div className="mt-4 hidden grid-cols-7 gap-2 xl:grid">
        {days.map((d) => (
          <div key={d} className="space-y-2">
            <p className={cn("text-center text-sm font-semibold", d === today && "text-primary")}>{format(parseLocalDate(d), "EEE d")}</p>
            {SLOTS.map((s) => <div key={s}>{slotView(d, s, true)}</div>)}
            <p className="text-center text-xs text-ink-muted tnum">{Math.round(totalsFor(byDay.get(d) ?? []).kcal)} kcal</p>
          </div>
        ))}
      </div>

      {adding ? <AddDialog target={adding} recipes={recipes} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); router.refresh(); }} /> : null}
    </div>
  );
}

function AddDialog({ target, recipes, onClose, onAdded }: { target: { date: string; slot: Slot }; recipes: { id: string; title: string; servings: number; kcal: number | null }[]; onClose: () => void; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [servings, setServings] = useState(1);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const { show } = useToast();
  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  const submit = (payload: { recipeId: string | null; note: string | null }) => start(async () => {
    const r = await addPlanEntry({ date: target.date, slot: target.slot, servings: payload.recipeId ? servings : null, ...payload });
    if (r.ok) onAdded(); else show({ message: r.error, tone: "error" });
  });
  return (
    <Dialog open onClose={onClose} title={`Add ${target.slot} · ${format(parseLocalDate(target.date), "EEE d MMM")}`}>
      <Input type="search" placeholder="Search your recipes" aria-label="Search your recipes" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {filtered.map((r) => (
          <li key={r.id}><button onClick={() => setPicked(r.id)} aria-pressed={picked === r.id} className={cn("flex min-h-12 w-full items-center justify-between gap-2 px-3 text-left", picked === r.id ? "bg-primary-soft" : "hover:bg-surface-muted")}>
            <span>{r.title}</span>{r.kcal != null ? <span className="shrink-0 text-sm text-accent tnum">{Math.round(r.kcal)} kcal</span> : null}</button></li>
        ))}
        {!filtered.length ? <li className="p-3 text-sm text-ink-muted">No recipes found.</li> : null}
      </ul>
      {picked ? (
        <div className="mt-3 flex items-end gap-2">
          <Field label="Servings" htmlFor="plan-servings"><Input id="plan-servings" type="number" min={0.5} max={100} step={0.5} value={servings} onChange={(e) => setServings(Number(e.target.value))} className="w-28" /></Field>
          <Button className="flex-1" disabled={pending} onClick={() => submit({ recipeId: picked, note: null })}>Add recipe</Button>
        </div>
      ) : null}
      <form className="mt-5 border-t border-border pt-4" onSubmit={(e) => { e.preventDefault(); submit({ recipeId: null, note }); }}>
        <Field label="Or add a note" htmlFor="plan-note" hint="For example “Dinner out” or “Leftovers”.">
          <div className="flex gap-2"><Input id="plan-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} required /><Button type="submit" variant="ghost" disabled={pending}>Add note</Button></div>
        </Field>
      </form>
    </Dialog>
  );
}
