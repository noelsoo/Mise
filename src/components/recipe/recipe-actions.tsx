"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookPlus, CalendarPlus, ChefHat, Copy, Pencil, Printer, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { useToast, useUndoableDelete } from "@/components/ui/toast";
import { deleteRecipe, duplicateRecipe, setSharing } from "@/lib/actions/recipes";
import { addPlanEntry } from "@/lib/actions/plan";
import { createCookbook, setRecipeInCookbook } from "@/lib/actions/cookbooks";
import { localDateString } from "@/lib/utils";

type Book = { id: string; name: string; has: boolean };

export function RecipeActions({ id, title, servings, shareSlug, siteUrl, books }: { id: string; title: string; servings: number; shareSlug: string | null; siteUrl: string; books: Book[] }) {
  const [open, setOpen] = useState<"plan" | "book" | "share" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();
  const undoDelete = useUndoableDelete();
  const [hidden, setHidden] = useState(false);

  return (
    <div className={hidden ? "hidden" : "no-print"}>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="accent"><Link href={`/cook/${id}`}><ChefHat aria-hidden /> Cook mode</Link></Button>
        <Button variant="ghost" onClick={() => setOpen("plan")}><CalendarPlus aria-hidden /> Plan</Button>
        <Button variant="ghost" onClick={() => setOpen("book")}><BookPlus aria-hidden /> Cookbook</Button>
        <Button variant="ghost" onClick={() => setOpen("share")}><Share2 aria-hidden /> Share</Button>
        <Button asChild variant="ghost" size="icon" aria-label="Edit"><Link href={`/recipes/${id}/edit`}><Pencil /></Link></Button>
        <Button variant="ghost" size="icon" aria-label="Print" onClick={() => window.print()}><Printer /></Button>
        <Button variant="ghost" size="icon" aria-label="Duplicate" disabled={pending} onClick={() => start(async () => {
          const r = await duplicateRecipe(id);
          if (r.ok) { show({ message: "Duplicated." }); router.push(`/recipes/${r.data!.id}/edit`); } else show({ message: r.error, tone: "error" });
        })}><Copy /></Button>
        <Button variant="ghost" size="icon" aria-label="Delete" className="text-danger" onClick={() => undoDelete({
          message: `Deleted “${title}”.`,
          hide: () => { setHidden(true); router.prefetch("/recipes"); },
          restore: () => setHidden(false),
          commit: async () => { const r = await deleteRecipe(id); if (!r.ok) return { error: r.error }; router.replace("/recipes"); },
        })}><Trash2 /></Button>
      </div>
      {open === "plan" ? <PlanDialog id={id} servings={servings} onClose={() => setOpen(null)} /> : null}
      {open === "book" ? <BookDialog id={id} books={books} onClose={() => setOpen(null)} /> : null}
      {open === "share" ? <ShareDialog id={id} title={title} slug={shareSlug} siteUrl={siteUrl} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function PlanDialog({ id, servings, onClose }: { id: string; servings: number; onClose: () => void }) {
  const [date, setDate] = useState(localDateString());
  const [slot, setSlot] = useState("dinner");
  const [s, setS] = useState(servings);
  const [pending, start] = useTransition();
  const { show } = useToast();
  return (
    <Dialog open onClose={onClose} title="Add to meal plan">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await addPlanEntry({ date, slot: slot as "dinner", recipeId: id, servings: s, note: null });
        if (r.ok) { show({ message: "Added to your plan." }); onClose(); } else show({ message: r.error, tone: "error" });
      }); }}>
        <Field label="Day" htmlFor="pd"><Input id="pd" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Meal" htmlFor="ps"><Select id="ps" value={slot} onChange={(e) => setSlot(e.target.value)}>{["breakfast", "lunch", "dinner", "snack"].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</Select></Field>
        <Field label="Servings" htmlFor="pv" hint="How many servings you'll cook. Groceries scale to this."><Input id="pv" type="number" min={0.5} max={100} step={0.5} value={s} onChange={(e) => setS(Number(e.target.value))} /></Field>
        <Button type="submit" className="w-full" disabled={pending}>Add to plan</Button>
      </form>
    </Dialog>
  );
}

function BookDialog({ id, books, onClose }: { id: string; books: Book[]; onClose: () => void }) {
  const [state, setState] = useState(books);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const { show } = useToast();
  return (
    <Dialog open onClose={onClose} title="Cookbooks">
      <ul className="divide-y divide-border">
        {state.map((b) => (
          <li key={b.id}><label className="flex min-h-12 items-center gap-3">
            <Checkbox checked={b.has} disabled={pending} onChange={(e) => {
              const has = e.target.checked;
              setState((all) => all.map((x) => (x.id === b.id ? { ...x, has } : x)));
              start(async () => { const r = await setRecipeInCookbook(b.id, id, has); if (!r.ok) show({ message: r.error, tone: "error" }); });
            }} />{b.name}</label></li>
        ))}
        {!state.length ? <li className="py-2 text-ink-muted">No cookbooks yet.</li> : null}
      </ul>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await createCookbook({ name });
        if (!r.ok) { show({ message: r.error, tone: "error" }); return; }
        await setRecipeInCookbook(r.data!.id, id, true);
        setState((all) => [...all, { id: r.data!.id, name, has: true }]); setName("");
      }); }}>
        <Input aria-label="New cookbook name" placeholder="New cookbook" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        <Button type="submit" disabled={pending}>Create</Button>
      </form>
    </Dialog>
  );
}

function ShareDialog({ id, title, slug: initial, siteUrl, onClose }: { id: string; title: string; slug: string | null; siteUrl: string; onClose: () => void }) {
  const [slug, setSlug] = useState(initial);
  const [pending, start] = useTransition();
  const { show } = useToast();
  const url = slug ? `${siteUrl}/share/${slug}` : null;
  return (
    <Dialog open onClose={onClose} title="Share recipe">
      <p className="text-ink-muted">Anyone with the link can view this recipe. They can&apos;t edit it or see anything else of yours.</p>
      {url ? (
        <div className="mt-4 space-y-3">
          <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Share link" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={async () => {
              if (navigator.share) { try { await navigator.share({ title, url }); } catch {} }
              else { await navigator.clipboard.writeText(url); show({ message: "Link copied." }); }
            }}>Share link</Button>
            <Button variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await setSharing(id, false); if (r.ok) setSlug(null); })}>Turn off link</Button>
          </div>
        </div>
      ) : (
        <Button className="mt-4 w-full" disabled={pending} onClick={() => start(async () => { const r = await setSharing(id, true); if (r.ok) setSlug(r.data!.slug); else show({ message: r.error, tone: "error" }); })}>Create public link</Button>
      )}
    </Dialog>
  );
}
