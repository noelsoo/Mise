"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { CloudOff, ListRestart, Plus, Share2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Checkbox, Input } from "@/components/ui/field";
import { useToast, useUndoableDelete } from "@/components/ui/toast";
import { addManualItem, deleteItems, generateFromPlan, setChecked } from "@/lib/actions/groceries";
import { AISLES, toShareText } from "@/lib/grocery/merge";
import type { GroceryRow } from "@/lib/supabase/database.types";
import { cn, parseLocalDate } from "@/lib/utils";

const QUEUE_KEY = "mise:grocery-ticks";
type Pending = Record<string, boolean>;

function readQueue(): Pending { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "{}"); } catch { return {}; } }
function writeQueue(q: Pending) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} }

export function GroceryList({ initial, week }: { initial: GroceryRow[]; week: string }) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [offline, setOffline] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();
  const undo = useUndoableDelete();


  // Ticks made offline are queued and sent when the connection returns.
  useEffect(() => {
    const flush = async () => {
      setOffline(!navigator.onLine);
      if (!navigator.onLine) return;
      const q = readQueue();
      const ids = Object.keys(q);
      if (!ids.length) return;
      await Promise.all(ids.map((id) => setChecked(id, q[id])));
      writeQueue({});
    };
    void flush();
    window.addEventListener("online", flush);
    window.addEventListener("offline", flush);
    return () => { window.removeEventListener("online", flush); window.removeEventListener("offline", flush); };
  }, []);

  const toggle = (it: GroceryRow) => {
    const checked = !it.checked;
    setItems((all) => all.map((x) => (x.id === it.id ? { ...x, checked } : x)));
    if (!navigator.onLine) { writeQueue({ ...readQueue(), [it.id]: checked }); return; }
    void setChecked(it.id, checked).then((r) => { if (!r.ok) { writeQueue({ ...readQueue(), [it.id]: checked }); } });
  };

  const groups = useMemo(() => {
    const regular = items.filter((i) => !i.is_staple);
    const order = [...AISLES] as string[];
    const by = new Map<string, GroceryRow[]>();
    for (const it of regular) by.set(it.aisle, [...(by.get(it.aisle) ?? []), it]);
    const out = [...by.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    const staples = items.filter((i) => i.is_staple);
    if (staples.length) out.push(["Probably have", staples]);
    return out.map(([aisle, list]) => [aisle, [...list].sort((a, b) => Number(a.checked) - Number(b.checked))] as const);
  }, [items]);

  const remaining = items.filter((i) => !i.checked).length;
  const checkedIds = items.filter((i) => i.checked).map((i) => i.id);

  const share = async () => {
    const text = `Mise grocery list\n\n${toShareText(items.map((i) => ({ name: i.name, quantityText: i.quantity_text ?? "", aisle: i.aisle, isStaple: i.is_staple, checked: i.checked })))}`;
    if (navigator.share) { try { await navigator.share({ title: "Grocery list", text }); return; } catch { return; } }
    await navigator.clipboard.writeText(text);
    show({ message: "List copied. Paste it into WhatsApp or Notes." });
  };

  const removeMany = (ids: string[], message: string) => {
    const removed = items.filter((i) => ids.includes(i.id));
    undo({
      message,
      hide: () => setItems((all) => all.filter((i) => !ids.includes(i.id))),
      restore: () => setItems((all) => [...all, ...removed]),
      commit: async () => { const r = await deleteItems(ids); if (!r.ok) return { error: r.error }; },
    });
  };

  return (
    <div>
      <div className="border-b border-border pb-4">
        <p className="label-caps text-primary">Groceries</p>
        <h1 className="headline-xl mt-1">Shopping list</h1>
        <p className="mt-1 text-ink-muted tnum">{remaining} to get{items.length ? ` · ${items.length - remaining} ticked` : ""}</p>
        {offline ? <p role="status" className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm text-accent-ink"><CloudOff className="size-4" aria-hidden /> Offline. Ticks will sync when you&apos;re back online.</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending || offline} onClick={() => start(async () => {
            const r = await generateFromPlan(week);
            if (!r.ok) { show({ message: r.error, tone: "error" }); return; }
            const d = r.data!;
            show({ message: d.added + d.updated ? `Built from the plan: ${d.added} new, ${d.updated} updated${d.removed ? `, ${d.removed} removed` : ""}.` : "Nothing planned that week yet." });
            router.refresh();
          })}><ListRestart aria-hidden /> {pending ? "Building…" : `Build from plan (week of ${format(parseLocalDate(week), "d MMM")})`}</Button>
          <Button variant="ghost" onClick={share} disabled={!items.length}><Share2 aria-hidden /> Share as text</Button>
          {checkedIds.length ? <Button variant="ghost" onClick={() => removeMany(checkedIds, `Cleared ${checkedIds.length} ticked items.`)}><Trash2 aria-hidden /> Clear ticked</Button> : null}
        </div>
      </div>

      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await addManualItem({ name, quantity: qty });
        if (!r.ok) { show({ message: r.error, tone: "error" }); return; }
        setItems((all) => [...all, { id: r.data!.id, user_id: "", name, quantity_text: qty || null, aisle: r.data!.aisle, merge_key: null, is_manual: true, is_staple: r.data!.staple, checked: false, sources: [], position: 0, created_at: "" }]);
        setName(""); setQty("");
      }); }}>
        <Input aria-label="Item" placeholder="Add an item" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required disabled={offline} />
        <Input aria-label="Quantity" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} maxLength={200} className="w-24" disabled={offline} />
        <Button type="submit" size="icon" aria-label="Add item" disabled={pending || offline}><Plus /></Button>
      </form>

      {!items.length ? (
        <div className="mt-6"><EmptyState title="Nothing on the list" body="Plan some meals, then build the list from your plan. You can also add items by hand." /></div>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map(([aisle, list]) => (
            <section key={aisle} aria-labelledby={`aisle-${aisle}`}>
              <h2 id={`aisle-${aisle}`} className="label-caps mb-2 text-ink-muted">{aisle}{aisle === "Probably have" ? " · check the cupboard" : ""}</h2>
              <Card className="divide-y divide-border">
                {list.map((it) => (
                  <div key={it.id} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
                    <Checkbox checked={it.checked} onChange={() => toggle(it)} aria-label={`${it.checked ? "Untick" : "Tick"} ${it.name}`} />
                    <button type="button" onClick={() => toggle(it)} className={cn("flex-1 py-2 text-left transition", it.checked && "line-through opacity-50")}>
                      <span className="first-letter:uppercase">{it.name}</span>
                      {it.sources.length ? <span className="block text-xs text-ink-muted">{it.sources.slice(0, 3).join(", ")}{it.sources.length > 3 ? ` +${it.sources.length - 3}` : ""}</span> : it.is_manual ? <span className="block text-xs text-ink-muted">Added by you</span> : null}
                    </button>
                    {it.quantity_text ? <span className="text-right text-sm text-ink-muted tnum">{it.quantity_text}</span> : null}
                    <button aria-label={`Remove ${it.name}`} onClick={() => removeMany([it.id], `Removed ${it.name}.`)} className="grid size-11 place-items-center rounded-md text-ink-muted hover:text-danger"><X className="size-4" /></button>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
