import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { Logo } from "@/components/brand/logo";
import { RecipeView } from "@/components/recipe/recipe-view";
import { PrintButton } from "@/components/recipe/print-button";
import { createClient } from "@/lib/supabase/server";
import type { IngredientRow, RecipeRow, StepRow } from "@/lib/supabase/database.types";
import { publicImageUrl } from "@/lib/env";
import { minutesLabel } from "@/lib/utils";

// Public, read-only. Data comes only through get_shared_recipe(slug), never direct table access.
const load = cache(async (slug: string) => {
  if (!z.string().uuid().safeParse(slug).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_recipe", { slug });
  if (!data) return null;
  return data as unknown as { recipe: RecipeRow; ingredients: IngredientRow[]; steps: StepRow[] };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  return data ? { title: data.recipe.title, description: data.recipe.description ?? undefined, robots: { index: false } } : { title: "Recipe not found" };
}

export default async function SharedRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { recipe: r, ingredients, steps } = data;
  const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 lg:px-12">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <PrintButton />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
        {r.photos[0] ? <div className="relative aspect-[16/10] overflow-hidden rounded-xl"><Image src={publicImageUrl(r.photos[0])} alt={r.title} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /></div> : null}
        <div>
          <p className="label-caps text-primary">Shared recipe{r.cuisine ? ` · ${r.cuisine}` : ""}</p>
          <h1 className="headline-xl mt-2">{r.title}</h1>
          {r.description ? <p className="mt-2 text-ink-muted">{r.description}</p> : null}
          {total ? <p className="mt-2 text-sm text-ink-muted">{minutesLabel(total)} total</p> : null}
          {r.source_url ? <p className="mt-2 text-sm">Original: <a className="font-semibold text-primary hover:underline" href={r.source_url} rel="noopener noreferrer nofollow" target="_blank">{new URL(r.source_url).hostname}</a></p> : null}
        </div>
      </div>
      <div className="mt-8"><RecipeView recipe={r} ingredients={ingredients} steps={steps} foodNames={{}} units="metric" readOnly /></div>
      <p className="no-print mt-10 text-center text-sm text-ink-muted">Saved with <Link href="/signup" className="font-semibold text-primary">Mise</Link>, a free recipe and meal-planning app.</p>
    </main>
  );
}
