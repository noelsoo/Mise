import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Heart, Plus } from "lucide-react";
import { Container } from "@/components/shell/page-header";
import { RecipeCard, type CardRecipe } from "@/components/recipe/recipe-card";
import { RecipeFilters } from "@/components/recipe/recipe-filters";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recipes" };

type SP = { q?: string; filter?: string; sort?: string };
const COLS = "id, title, photos, prep_minutes, cook_minutes, kcal, protein_g, carbs_g, fat_g, servings, favourite, counted_count, ingredient_count, updated_at, last_opened_at";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Singapore" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

async function RecipeGrid({ sp }: { sp: SP }) {
  const { supabase } = await requireUser();
  type Row = CardRecipe & { updated_at: string; last_opened_at: string | null };
  let rows: Row[] = [];
  const q = sp.q?.trim().slice(0, 80);
  if (q) {
    const { data } = await supabase.rpc("search_recipes", { q });
    rows = (data ?? []) as Row[];
  } else {
    const { data } = await supabase.from("recipes").select(COLS).order("updated_at", { ascending: false }).limit(500);
    rows = (data ?? []) as Row[];
  }
  const mins = (r: Row) => (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  switch (sp.filter) {
    case "quick": rows = rows.filter((r) => mins(r) > 0 && mins(r) <= 30); break;
    case "protein": rows = rows.filter((r) => (r.protein_g ?? 0) >= 25); break;
    case "light": rows = rows.filter((r) => r.kcal != null && r.kcal < 500); break;
    case "favourites": rows = rows.filter((r) => r.favourite); break;
  }
  const by = <T,>(f: (r: Row) => T, dir = 1, nullsLast = true) => (a: Row, b: Row) => {
    const x = f(a), y = f(b);
    if (x == null || y == null) return x == null && y == null ? 0 : x == null === nullsLast ? 1 : -1;
    return x < y ? -dir : x > y ? dir : 0;
  };
  if (!q || sp.sort) {
    switch (sp.sort) {
      case "opened": rows.sort(by((r) => r.last_opened_at, -1)); break;
      case "time": rows.sort(by((r) => (mins(r) || null))); break;
      case "kcal": rows.sort(by((r) => r.kcal)); break;
      case "protein": rows.sort(by((r) => r.protein_g, -1)); break;
      case "title": rows.sort((a, b) => a.title.localeCompare(b.title, "en-GB")); break;
    }
  }
  if (!rows.length) {
    return q || (sp.filter && sp.filter !== "all")
      ? <EmptyState title="Nothing matches" body="Try a different search or filter." />
      : <EmptyState title="Your recipe ledger is empty" body="Import a recipe from a link, paste one in, snap a photo of a cookbook page or type it up." action={<Button asChild variant="accent"><Link href="/add"><Plus aria-hidden /> Add your first recipe</Link></Button>} />;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
      {rows.map((r, i) => <li key={r.id} className="flex"><div className="w-full"><RecipeCard r={r} priority={i < 4} /></div></li>)}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4" aria-label="Loading recipes">
      {Array.from({ length: 8 }).map((_, i) => <Card key={i} className="overflow-hidden"><Skeleton className="aspect-[16/10] rounded-none" /><div className="space-y-2 p-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></Card>)}
    </div>
  );
}

export default async function RecipesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser();
  const profile = await getProfile();
  const [{ count: total }, { count: favs }, { data: books }] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("favourite", true),
    supabase.from("cookbooks").select("id, name, cookbook_recipes(count)").order("created_at").limit(6),
  ]);
  return (
    <Container>
      <p className="label-caps text-primary">{greeting()}{profile?.display_name ? `, ${profile.display_name}` : ""}</p>
      <h1 className="headline-xl mt-1">What would you like to cook?</h1>
      <div className="mt-6"><RecipeFilters /></div>

      <section className="mt-8" aria-labelledby="books-h">
        <div className="flex items-baseline justify-between">
          <h2 id="books-h" className="text-2xl">Cookbooks</h2>
          <Link href="/cookbooks" className="text-sm font-semibold text-primary hover:underline">View all</Link>
        </div>
        <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          <li><Link href="/recipes" className="flex h-24 w-44 flex-col justify-between rounded-lg border border-border bg-surface p-3 hover:shadow-2"><BookOpen className="size-5 text-primary" aria-hidden /><span><span className="block font-semibold">All recipes</span><span className="text-sm text-ink-muted tnum">{total ?? 0} recipes</span></span></Link></li>
          <li><Link href="/recipes?filter=favourites" className="flex h-24 w-44 flex-col justify-between rounded-lg border border-border bg-surface p-3 hover:shadow-2"><Heart className="size-5 text-accent" aria-hidden /><span><span className="block font-semibold">Favourites</span><span className="text-sm text-ink-muted tnum">{favs ?? 0} recipes</span></span></Link></li>
          {(books ?? []).map((b) => (
            <li key={b.id}><Link href={`/cookbooks/${b.id}`} className="flex h-24 w-44 flex-col justify-between rounded-lg border border-border bg-surface p-3 hover:shadow-2"><BookOpen className="size-5 text-ink-muted" aria-hidden /><span><span className="block truncate font-semibold">{b.name}</span><span className="text-sm text-ink-muted tnum">{(b.cookbook_recipes as unknown as { count: number }[])[0]?.count ?? 0} recipes</span></span></Link></li>
          ))}
          <li><Link href="/cookbooks?new=1" className="grid h-24 w-44 place-items-center rounded-lg border border-dashed border-border text-sm font-semibold text-primary hover:bg-surface"><span className="flex items-center gap-1"><Plus className="size-4" aria-hidden /> New cookbook</span></Link></li>
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="recipes-h">
        <h2 id="recipes-h" className="mb-3 text-2xl">{sp.q ? `Results for “${sp.q}”` : "Your recipes"}</h2>
        <Suspense key={JSON.stringify(sp)} fallback={<GridSkeleton />}><RecipeGrid sp={sp} /></Suspense>
      </section>
    </Container>
  );
}
