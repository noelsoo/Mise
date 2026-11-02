"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks, Maximize, Pause, Play, Sun, Timer, X } from "lucide-react";
import type { IngredientRow, RecipeRow, StepRow } from "@/lib/supabase/database.types";
import { findTimers, formatClock } from "@/lib/timers";
import { displayQuantity } from "@/components/recipe/recipe-view";
import { cn } from "@/lib/utils";

type RunningTimer = { id: number; label: string; total: number; endsAt: number | null; left: number };

function useWakeLock() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          lock = await navigator.wakeLock.request("screen");
          setActive(true);
          lock.addEventListener("release", () => setActive(false));
        }
      } catch { setActive(false); }
    };
    void request();
    // The lock is dropped when the tab is hidden; take it again on return.
    const onVis = () => { if (document.visibilityState === "visible") void request(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); void lock?.release(); };
  }, []);
  return active;
}

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
    navigator.vibrate?.([300, 150, 300]);
  } catch {}
}

export function CookMode({ recipe, ingredients, steps, units }: { recipe: RecipeRow; ingredients: IngredientRow[]; steps: StepRow[]; units: "metric" | "us" }) {
  const [i, setI] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const awake = useWakeLock();
  const nextId = useRef(1);
  const step = steps[i];
  const total = steps.length;

  const go = useCallback((d: number) => setI((x) => Math.min(Math.max(0, x + d), Math.max(0, total - 1))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Tick once a second; timers count from a fixed end time so they stay accurate in the background.
  useEffect(() => {
    if (!timers.some((t) => t.endsAt)) return;
    const h = setInterval(() => {
      setTimers((all) => all.map((t) => {
        if (!t.endsAt) return t;
        const left = Math.max(0, (t.endsAt - Date.now()) / 1000);
        if (left === 0 && t.left > 0) beep();
        return { ...t, left, endsAt: left === 0 ? null : t.endsAt };
      }));
    }, 500);
    return () => clearInterval(h);
  }, [timers]);

  const startTimer = (label: string, seconds: number) => setTimers((all) => [...all, { id: nextId.current++, label, total: seconds, left: seconds, endsAt: Date.now() + seconds * 1000 }]);
  const toggle = (id: number) => setTimers((all) => all.map((t) => (t.id !== id ? t : t.endsAt ? { ...t, endsAt: null } : t.left > 0 ? { ...t, endsAt: Date.now() + t.left * 1000 } : t)));

  // Swipe left/right to change step.
  const touch = useRef<number | null>(null);

  return (
    <div className="cook-theme fixed inset-0 z-50 flex flex-col bg-canvas text-ink"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); touch.current = null; }}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Link href={`/recipes/${recipe.id}`} aria-label="Leave cook mode" className="grid size-11 place-items-center rounded-md hover:bg-surface"><X className="size-6" /></Link>
        <h1 className="line-clamp-1 flex-1 font-serif text-xl">{recipe.title}</h1>
        <span className={cn("hidden items-center gap-1 text-xs sm:flex", awake ? "text-primary" : "text-ink-muted")}><Sun className="size-4" aria-hidden />{awake ? "Screen stays on" : "Screen may sleep"}</span>
        <button aria-label="Full screen" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="grid size-11 place-items-center rounded-md hover:bg-surface"><Maximize className="size-5" /></button>
        <button aria-pressed={showIngredients} onClick={() => setShowIngredients((s) => !s)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-surface"><ListChecks className="size-5" aria-hidden /> Ingredients</button>
      </header>

      {timers.length ? (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2" aria-label="Timers">
          {timers.map((t) => (
            <div key={t.id} className={cn("flex shrink-0 items-center gap-2 rounded-full px-3 py-1", t.left === 0 ? "animate-pulse bg-accent text-white" : "bg-surface")}>
              <Timer className="size-4" aria-hidden />
              <span className="font-semibold tnum" role="timer" aria-label={`${t.label} timer`}>{t.left === 0 ? "Done" : formatClock(t.left)}</span>
              <span className="text-xs opacity-70">{t.label}</span>
              {t.left > 0 ? <button aria-label={t.endsAt ? "Pause timer" : "Resume timer"} onClick={() => toggle(t.id)} className="grid size-9 place-items-center rounded-full hover:bg-surface-high">{t.endsAt ? <Pause className="size-4" /> : <Play className="size-4" />}</button> : null}
              <button aria-label="Dismiss timer" onClick={() => setTimers((all) => all.filter((x) => x.id !== t.id))} className="grid size-9 place-items-center rounded-full hover:bg-surface-high"><X className="size-4" /></button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 md:px-12">
          {step ? (
            <>
              <p className="label-caps text-primary">Step {i + 1} of {total}{step.group_name ? ` · ${step.group_name}` : ""}</p>
              <div className="mt-2 flex gap-1" aria-hidden>{steps.map((s, k) => <span key={s.id} className={cn("h-1 flex-1 rounded-full", k <= i ? "bg-primary" : "bg-surface-high")} />)}</div>
              <p className="mt-8 max-w-3xl text-[28px] font-medium leading-10 tracking-[-0.01em]" aria-live="polite">{step.text}</p>
              {findTimers(step.text).length ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {findTimers(step.text).map((t, k) => (
                    <button key={k} onClick={() => startTimer(t.label, t.seconds)} className="flex min-h-14 items-center gap-2 rounded-full bg-accent px-5 text-lg font-semibold text-white">
                      <Timer className="size-5" aria-hidden /> Start {t.label} timer
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : <p className="text-2xl">This recipe has no steps yet.</p>}
        </main>
        {showIngredients ? (
          <aside className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-border bg-surface p-4 md:static" aria-label="Ingredients">
            <ul className="space-y-2 text-lg">
              {ingredients.map((ing) => (
                <li key={ing.id} className="flex justify-between gap-3 border-b border-border pb-2"><span>{ing.quantity == null ? ing.raw : ing.name}</span><span className="text-ink-muted tnum">{displayQuantity(ing.quantity, ing.quantity2, ing.unit, 1, units)}</span></li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button disabled={i === 0} onClick={() => go(-1)} className="flex min-h-16 items-center justify-center gap-2 rounded-lg bg-surface text-lg font-semibold disabled:opacity-40"><ChevronLeft className="size-6" aria-hidden /> Back</button>
        {i < total - 1
          ? <button onClick={() => go(1)} className="flex min-h-16 items-center justify-center gap-2 rounded-lg bg-primary text-lg font-semibold text-on-primary">Next <ChevronRight className="size-6" aria-hidden /></button>
          : <Link href={`/recipes/${recipe.id}`} className="flex min-h-16 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-on-primary">Finish</Link>}
      </footer>
    </div>
  );
}
