import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, withTagline }: { className?: string; withTagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="grid size-10 place-items-center rounded-lg bg-primary text-on-primary"><Sprout className="size-5" aria-hidden /></span>
      <span className="leading-tight">
        <span className="block font-serif text-2xl font-medium">Mise</span>
        {withTagline ? <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Culinary ledger</span> : null}
      </span>
    </span>
  );
}
