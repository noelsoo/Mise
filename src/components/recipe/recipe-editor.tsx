"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl } from "@/lib/env";
import { saveRecipe } from "@/lib/actions/recipes";
import { cn } from "@/lib/utils";

export type EditorValue = {
  id?: string;
  title: string; description: string; servings: number; prep_minutes: string; cook_minutes: string;
  cuisine: string; course: string; tags: string; notes: string; source_url: string; rating: number | null; favourite: boolean;
  photos: string[];
  ingredientsText: string; stepsText: string;
};

/** Ingredients: one per line, a line ending in ":" starts a group. Steps: blank line between steps. */
export function toBlocks(text: string, kind: "ingredients" | "steps") {
  const out: { group: string | null; raw: string }[] = [];
  let group: string | null = null;
  const chunks = kind === "ingredients" ? text.split("\n") : text.split(/\n\s*\n/);
  for (const c of chunks) {
    const t = c.trim().replace(/\s*\n\s*/g, " ");
    if (!t) continue;
    if (t.endsWith(":") && t.length <= 81) { group = t.slice(0, -1).trim() || null; continue; }
    out.push({ group, raw: t });
  }
  return out;
}

export function fromBlocks(items: { group: string | null; text: string }[], sep: string) {
  let last: string | null = null;
  const parts: string[] = [];
  for (const it of items) {
    if (it.group && it.group !== last) parts.push(`${it.group}:`);
    last = it.group;
    parts.push(it.text);
  }
  return parts.join(sep);
}

const MAX_BYTES = 5 * 1024 * 1024;

export function RecipeEditor({ initial, userId, heading }: { initial: EditorValue; userId: string; heading: string }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof EditorValue>(k: K, val: EditorValue[K]) => setV((p) => ({ ...p, [k]: val }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const f of Array.from(files).slice(0, 10 - v.photos.length)) {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type) || f.size > MAX_BYTES) { show({ message: `${f.name}: use a JPEG, PNG or WebP under 5 MB.`, tone: "error" }); continue; }
      const ext = f.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: e } = await supabase.storage.from("recipe-images").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
      if (e) show({ message: "A photo failed to upload.", tone: "error" }); else added.push(path);
    }
    setV((p) => ({ ...p, photos: [...p.photos, ...added] }));
    setUploading(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveRecipe({
        id: v.id, title: v.title, description: v.description, servings: v.servings,
        prep_minutes: v.prep_minutes, cook_minutes: v.cook_minutes, cuisine: v.cuisine, course: v.course,
        tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean), notes: v.notes, source_url: v.source_url,
        rating: v.rating, favourite: v.favourite, photos: v.photos,
        ingredients: toBlocks(v.ingredientsText, "ingredients"),
        steps: toBlocks(v.stepsText, "steps").map((s) => ({ group: s.group, text: s.raw })),
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/recipes/${res.data!.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h1 className="headline-xl">{heading}</h1>
      <Card className="space-y-4 p-5">
        <Field label="Title" htmlFor="title"><Input id="title" required maxLength={200} value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Description" htmlFor="description"><Textarea id="description" maxLength={2000} value={v.description} onChange={(e) => set("description", e.target.value)} className="min-h-20" /></Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Photos</p>
          <div className="flex flex-wrap gap-3">
            {v.photos.map((p, i) => (
              <div key={p} className="relative size-24 overflow-hidden rounded-lg border border-border">
                <Image src={publicImageUrl(p)} alt={`Photo ${i + 1}`} fill sizes="96px" className="object-cover" />
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => set("photos", v.photos.filter((x) => x !== p))}
                  className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white"><X className="size-4" /></button>
              </div>
            ))}
            {v.photos.length < 10 ? (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="grid size-24 place-items-center rounded-lg border border-dashed border-border text-ink-muted hover:bg-surface-muted">
                {uploading ? <Loader2 className="size-6 animate-spin" aria-label="Uploading" /> : <span className="flex flex-col items-center text-xs"><ImagePlus className="size-6" aria-hidden />Add photo</span>}
              </button>
            ) : null}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </div>
        </div>
      </Card>

      <Card className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
        <Field label="Servings" htmlFor="servings"><Input id="servings" type="number" inputMode="decimal" min={0.5} max={100} step={0.5} required value={v.servings} onChange={(e) => set("servings", Number(e.target.value))} /></Field>
        <Field label="Prep (min)" htmlFor="prep"><Input id="prep" type="number" inputMode="numeric" min={0} max={10000} value={v.prep_minutes} onChange={(e) => set("prep_minutes", e.target.value)} /></Field>
        <Field label="Cook (min)" htmlFor="cook"><Input id="cook" type="number" inputMode="numeric" min={0} max={10000} value={v.cook_minutes} onChange={(e) => set("cook_minutes", e.target.value)} /></Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold" id="rating-label">Rating</p>
          <div role="radiogroup" aria-labelledby="rating-label" className="flex h-12 items-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={v.rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => set("rating", v.rating === n ? null : n)} className="grid size-11 place-items-center">
                <Star className={cn("size-5", v.rating && n <= v.rating ? "fill-carbs text-carbs" : "text-ink-muted")} />
              </button>
            ))}
          </div>
        </div>
        <Field label="Cuisine" htmlFor="cuisine"><Input id="cuisine" maxLength={60} value={v.cuisine} onChange={(e) => set("cuisine", e.target.value)} placeholder="Singaporean" /></Field>
        <Field label="Course" htmlFor="course"><Input id="course" maxLength={60} value={v.course} onChange={(e) => set("course", e.target.value)} placeholder="Main" /></Field>
        <div className="col-span-2"><Field label="Tags" htmlFor="tags" hint="Separate with commas."><Input id="tags" value={v.tags} onChange={(e) => set("tags", e.target.value)} placeholder="weeknight, high protein" /></Field></div>
      </Card>

      <Card className="p-5">
        <Field label="Ingredients" htmlFor="ingredients" hint='One per line, e.g. "200 g chicken breast, sliced". A line ending in ":" starts a group, e.g. "For the sauce:".'>
          <Textarea id="ingredients" value={v.ingredientsText} onChange={(e) => set("ingredientsText", e.target.value)} className="min-h-56 font-mono text-sm" />
        </Field>
      </Card>
      <Card className="p-5">
        <Field label="Steps" htmlFor="steps" hint='Leave a blank line between steps. A line ending in ":" starts a group.'>
          <Textarea id="steps" value={v.stepsText} onChange={(e) => set("stepsText", e.target.value)} className="min-h-56" />
        </Field>
      </Card>
      <Card className="space-y-4 p-5">
        <Field label="Notes" htmlFor="notes"><Textarea id="notes" maxLength={10000} value={v.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <Field label="Source link" htmlFor="source"><Input id="source" type="url" maxLength={2000} value={v.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="https://" /></Field>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={v.favourite} onChange={(e) => set("favourite", e.target.checked)} /> Favourite</label>
      </Card>

      {error ? <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
      <div className="sticky bottom-20 z-10 flex gap-2 rounded-lg border border-border bg-surface p-3 shadow-3 lg:bottom-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={pending || uploading}>{pending ? "Saving and counting macros…" : "Save recipe"}</Button>
      </div>
    </form>
  );
}

export const emptyEditor: EditorValue = {
  title: "", description: "", servings: 2, prep_minutes: "", cook_minutes: "", cuisine: "", course: "", tags: "",
  notes: "", source_url: "", rating: null, favourite: false, photos: [], ingredientsText: "", stepsText: "",
};
