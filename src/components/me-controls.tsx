"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { deleteAccount } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const subscribe = (cb: () => void) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); };
const readTheme = (): Theme => { try { return (localStorage.getItem("theme") as Theme) ?? "system"; } catch { return "system"; } };

export function ThemeToggle() {
  const stored = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const [override, setOverride] = useState<Theme | null>(null);
  const theme = override ?? stored;
  const choose = (t: Theme) => {
    setOverride(t);
    try { if (t === "system") localStorage.removeItem("theme"); else localStorage.setItem("theme", t); } catch {}
    apply(t);
  };
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-md bg-surface-muted p-1">
      {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, Icon]) => (
        <button key={t} role="radio" aria-checked={theme === t} aria-label={t} onClick={() => choose(t)}
          className={cn("grid size-11 place-items-center rounded-md", theme === t ? "bg-surface shadow-1 text-primary" : "text-ink-muted")}>
          <Icon className="size-5" aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="ghost" className="w-full text-danger" onClick={() => setOpen(true)}><Trash2 aria-hidden /> Delete my account</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account">
        <p>This permanently deletes your recipes, photos, cookbooks, plans and grocery lists. It can&apos;t be undone. Export your data first if you want a copy.</p>
        <label htmlFor="confirm-delete" className="mt-4 block text-sm font-semibold">Type DELETE to confirm</label>
        <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="mt-1.5" />
        {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" disabled={confirm !== "DELETE" || pending}
            onClick={() => start(async () => { const r = await deleteAccount(); if (r?.error) setError(r.error); })}>
            {pending ? "Deleting…" : "Delete forever"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
