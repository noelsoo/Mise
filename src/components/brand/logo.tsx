import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, withTagline }: { className?: string; withTagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 rounded-[10px]" priority />
      <span className="leading-tight">
        <span className="block font-serif text-2xl font-medium">Mise</span>
        {withTagline ? <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Culinary ledger</span> : null}
      </span>
    </span>
  );
}
