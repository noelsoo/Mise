import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-border bg-surface shadow-1", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-md bg-surface-high", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

export function Pill({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold tnum", className)} {...props} />;
}

type Macro = "protein" | "carbs" | "fat";
const macroStyle: Record<Macro, { cls: string; dot: string; label: string }> = {
  protein: { cls: "bg-protein/10 text-protein", dot: "bg-protein", label: "Protein" },
  carbs: { cls: "bg-carbs/12 text-carbs-ink", dot: "bg-carbs", label: "Carbs" },
  fat: { cls: "bg-fat/10 text-fat", dot: "bg-fat", label: "Fat" },
};

/** Macro pill: colour is never the only signal, the label is always shown. */
export function MacroPill({ macro, grams, partial }: { macro: Macro; grams: number | null; partial?: boolean }) {
  const s = macroStyle[macro];
  return (
    <Pill className={s.cls}>
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label} {grams == null ? "–" : `${partial ? "≥" : ""}${Math.round(grams)}g`}
    </Pill>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
