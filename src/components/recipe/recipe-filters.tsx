"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "quick", label: "Under 30 min" },
  { id: "protein", label: "High protein" },
  { id: "light", label: "Under 500 kcal" },
  { id: "favourites", label: "Favourites" },
] as const;

export const SORTS = [
  { id: "recent", label: "Recently updated" },
  { id: "opened", label: "Recently opened" },
  { id: "time", label: "Quickest" },
  { id: "kcal", label: "Fewest calories" },
  { id: "protein", label: "Most protein" },
  { id: "title", label: "A to Z" },
] as const;

export function RecipeFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();
  const filter = params.get("filter") ?? "all";
  const sort = params.get("sort") ?? "recent";

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, val] of Object.entries(patch)) { if (val == null || val === "" || val === "all" || (k === "sort" && val === "recent")) next.delete(k); else next.set(k, val); }
    start(() => router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  // Debounced search.
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-3" aria-busy={pending}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes or ingredients" aria-label="Search recipes"
          className="h-12 w-full rounded-lg border border-border bg-surface pl-12 pr-12 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20" />
        {q ? <button aria-label="Clear search" onClick={() => setQ("")} className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center"><X className="size-5" /></button> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => update({ filter: f.id })} aria-pressed={filter === f.id}
              className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold", filter === f.id ? "border-primary bg-primary text-on-primary" : "border-border bg-surface")}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-muted">Sort
          <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-11 w-auto text-sm">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </label>
      </div>
    </div>
  );
}
