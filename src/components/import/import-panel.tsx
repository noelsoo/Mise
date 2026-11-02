"use client";
import { useState, useTransition } from "react";
import { Camera, ClipboardPaste, Link2, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { RecipeEditor, emptyEditor, fromBlocks, type EditorValue } from "@/components/recipe/recipe-editor";
import { importFromText, importFromUrl, type ImportResult } from "@/lib/actions/import";
import { cn } from "@/lib/utils";

type Tab = "url" | "text" | "photo" | "manual";
const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
  { id: "url", label: "From a link", icon: Link2 },
  { id: "text", label: "Paste text", icon: ClipboardPaste },
  { id: "photo", label: "From a photo", icon: Camera },
  { id: "manual", label: "Type it in", icon: PenLine },
];

function toEditor(res: Extract<ImportResult, { ok: true }>): EditorValue {
  const d = res.draft;
  return {
    ...emptyEditor,
    title: d.title, description: d.description ?? "", servings: d.servings ?? 2,
    prep_minutes: d.prepMinutes?.toString() ?? "", cook_minutes: d.cookMinutes?.toString() ?? "",
    cuisine: d.cuisine ?? "", course: d.course ?? "", tags: d.tags.join(", "), notes: d.notes ?? "",
    source_url: d.sourceUrl ?? "", photos: res.photos,
    ingredientsText: fromBlocks(d.ingredients.map((i) => ({ group: i.group, text: i.raw })), "\n"),
    stepsText: fromBlocks(d.steps.map((s) => ({ group: s.group, text: s.text })), "\n\n"),
  };
}

export function ImportPanel({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorValue | null>(null);
  const [ocr, setOcr] = useState<{ progress: number; status: string } | null>(null);
  const [pending, start] = useTransition();

  const finish = (res: ImportResult) => {
    if (!res.ok) { setError(res.error); return; }
    setWarning(res.warning ?? null);
    setDraft(toEditor(res));
  };

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) { setError("Use a photo under 15 MB."); return; }
    setError(null);
    setOcr({ progress: 0, status: "Loading text reader" });
    try {
      // Runs entirely in the browser: the photo never leaves the device for OCR.
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", undefined, {
        logger: (m: { status: string; progress: number }) => setOcr({ progress: m.progress, status: m.status }),
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setOcr(null);
      setText(data.text);
      start(async () => finish(await importFromText(data.text)));
    } catch {
      setOcr(null);
      setError("Couldn't read text from that photo. Try a sharper, well-lit photo, or paste the text.");
    }
  }

  if (draft) {
    return (
      <div>
        <p role="status" className="mb-4 rounded-md bg-primary-soft px-4 py-3 text-sm text-primary">
          Check everything below, then save. Nothing is saved until you do.
        </p>
        {warning ? <p className="mb-4 rounded-md bg-accent-soft px-4 py-3 text-sm text-accent-ink">{warning}</p> : null}
        <RecipeEditor initial={draft} userId={userId} heading="Review import" />
        <Button variant="quiet" className="mt-2" onClick={() => setDraft(null)}>Start over</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="How to add" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setError(null); if (t.id === "manual") setDraft(emptyEditor); }}
            className={cn("flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-semibold", tab === t.id ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface")}>
            <t.icon className="size-6" aria-hidden />{t.label}
          </button>
        ))}
      </div>

      {tab === "url" ? (
        <Card className="p-5">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => finish(await importFromUrl(url))); }}>
            <Field label="Recipe link" htmlFor="url" hint="Recipe sites, plus TikTok and Instagram videos (it reads the caption).">
              <Input id="url" type="url" inputMode="url" required placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>{pending ? <><Loader2 className="animate-spin" aria-hidden /> Reading the page…</> : "Import"}</Button>
          </form>
        </Card>
      ) : null}

      {tab === "text" ? (
        <Card className="p-5">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => finish(await importFromText(text))); }}>
            <Field label="Recipe text" htmlFor="text" hint="Paste the title, ingredients and method. Headings like “Ingredients” and “Method” help.">
              <Textarea id="text" required value={text} onChange={(e) => setText(e.target.value)} className="min-h-64" />
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Reading…" : "Continue"}</Button>
          </form>
        </Card>
      ) : null}

      {tab === "photo" ? (
        <Card className="p-5">
          <p className="text-ink-muted">Snap a cookbook page or recipe card. Text is read on your device.</p>
          <label className={cn("mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-primary hover:bg-surface-muted", ocr && "pointer-events-none opacity-60")}>
            <Camera className="size-8" aria-hidden />
            <span className="font-semibold">Take or choose a photo</span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => readPhoto(e.target.files?.[0])} />
          </label>
          {ocr ? (
            <div className="mt-4" role="status">
              <p className="text-sm capitalize text-ink-muted">{ocr.status}…</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-high"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round(ocr.progress * 100)}%` }} /></div>
            </div>
          ) : null}
          {pending ? <p className="mt-4 text-sm text-ink-muted" role="status">Sorting ingredients and steps…</p> : null}
        </Card>
      ) : null}

      {error ? <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
