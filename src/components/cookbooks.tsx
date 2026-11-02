"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast, useUndoableDelete } from "@/components/ui/toast";
import { RecipeCard, type CardRecipe } from "@/components/recipe/recipe-card";
import { createCookbook, deleteCookbook, renameCookbook, reorderCookbook, setRecipeInCookbook } from "@/lib/actions/cookbooks";

export function NewCookbookButton({ startOpen }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(startOpen));
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus aria-hidden /> New cookbook</Button>
      <CookbookDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CookbookDialog({ open, onClose, book }: { open: boolean; onClose: () => void; book?: { id: string; name: string; description: string | null } }) {
  const [name, setName] = useState(book?.name ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onClose={onClose} title={book ? "Edit cookbook" : "New cookbook"}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = book ? await renameCookbook(book.id, { name, description }) : await createCookbook({ name, description });
        if (!r.ok) { setError(r.error); return; }
        onClose();
        if (!book && r.data && "id" in r.data) router.push(`/cookbooks/${r.data.id}`); else router.refresh();
      }); }}>
        <Field label="Name" htmlFor="cb-name"><Input id="cb-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description (optional)" htmlFor="cb-desc"><Textarea id="cb-desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" /></Field>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>{book ? "Save" : "Create"}</Button>
      </form>
    </Dialog>
  );
}

export function CookbookDetail({ book, recipes: initial }: { book: { id: string; name: string; description: string | null }; recipes: CardRecipe[] }) {
  const [recipes, setRecipes] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();
  const undo = useUndoableDelete();

  const move = (i: number, d: -1 | 1) => {
    const next = [...recipes];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setRecipes(next);
    start(async () => { const r = await reorderCookbook(book.id, next.map((x) => x.id)); if (!r.ok) show({ message: r.error, tone: "error" }); });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="label-caps text-primary">Cookbook · {recipes.length} recipes</p>
          <h1 className="headline-xl mt-1">{book.name}</h1>
          {book.description ? <p className="mt-1 text-ink-muted">{book.description}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(true)}><Pencil aria-hidden /> Edit</Button>
          <Button variant="ghost" className="text-danger" onClick={() => undo({
            message: `Deleted “${book.name}”. Recipes are kept.`,
            hide: () => router.prefetch("/cookbooks"),
            restore: () => {},
            commit: async () => { const r = await deleteCookbook(book.id); if (!r.ok) return { error: r.error }; router.replace("/cookbooks"); },
          })}><Trash2 aria-hidden /> Delete</Button>
        </div>
      </div>
      {recipes.length ? (
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {recipes.map((r, i) => (
            <li key={r.id} className="flex flex-col gap-1">
              <RecipeCard r={r} />
              <div className="flex justify-between">
                <div className="flex">
                  <Button variant="quiet" size="icon" aria-label={`Move ${r.title} earlier`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                  <Button variant="quiet" size="icon" aria-label={`Move ${r.title} later`} disabled={i === recipes.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                </div>
                <Button variant="quiet" size="icon" aria-label={`Remove ${r.title} from cookbook`} onClick={() => undo({
                  message: `Removed “${r.title}”.`,
                  hide: () => setRecipes((all) => all.filter((x) => x.id !== r.id)),
                  restore: () => setRecipes((all) => { const n = [...all]; n.splice(i, 0, r); return n; }),
                  commit: async () => { const res = await setRecipeInCookbook(book.id, r.id, false); if (!res.ok) return { error: res.error }; },
                })}><X /></Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mt-6 p-8 text-center text-ink-muted">No recipes yet. Open a recipe and use <span className="font-semibold text-ink">Cookbook</span> to add it here. <Link href="/recipes" className="font-semibold text-primary hover:underline">Browse recipes</Link></Card>
      )}
      <CookbookDialog open={editing} onClose={() => setEditing(false)} book={book} />
    </div>
  );
}
