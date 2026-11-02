import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, Star } from "lucide-react";
import { Container } from "@/components/shell/page-header";
import { FavouriteButton } from "@/components/recipe/favourite-button";
import { RecipeActions } from "@/components/recipe/recipe-actions";
import { RecipeView } from "@/components/recipe/recipe-view";
import { MarkOpened } from "@/components/recipe/mark-opened";
import { Pill } from "@/components/ui/card";
import { loadRecipe } from "@/lib/data/recipe";
import { getProfile } from "@/lib/supabase/server";
import { publicImageUrl, SITE_URL } from "@/lib/env";
import { minutesLabel } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { recipe } = await loadRecipe(id);
  return { title: recipe.title };
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recipe: r, ingredients, steps, supabase } = await loadRecipe(id);
  const profile = await getProfile();
  const foodIds = [...new Set(ingredients.map((i) => i.food_id).filter((x): x is number => x != null))];
  const customIds = [...new Set(ingredients.map((i) => i.custom_food_id).filter((x): x is string => x != null))];
  const [{ data: foods }, { data: customs }, { data: books }, { data: inBooks }] = await Promise.all([
    foodIds.length ? supabase.from("foods").select("id, name").in("id", foodIds) : Promise.resolve({ data: [] as { id: number; name: string }[] }),
    customIds.length ? supabase.from("custom_foods").select("id, name").in("id", customIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("cookbooks").select("id, name").order("name"),
    supabase.from("cookbook_recipes").select("cookbook_id").eq("recipe_id", id),
  ]);
  const foodNames: Record<string, string> = {};
  foods?.forEach((f) => (foodNames[`f${f.id}`] = f.name));
  customs?.forEach((c) => (foodNames[`c${c.id}`] = c.name));
  const has = new Set((inBooks ?? []).map((b) => b.cookbook_id));
  const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);

  return (
    <Container>
      <MarkOpened id={r.id} />
      <Link href="/recipes" className="no-print mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="size-4" aria-hidden /> Recipes</Link>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface-high">
          {r.photos[0] ? <Image src={publicImageUrl(r.photos[0])} alt={r.title} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /> : null}
          <div className="no-print absolute right-3 top-3"><FavouriteButton id={r.id} favourite={r.favourite} /></div>
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {r.cuisine ? <Pill className="bg-primary-soft text-primary">{r.cuisine}</Pill> : null}
            {r.course ? <Pill className="bg-surface-high text-ink">{r.course}</Pill> : null}
            {r.tags.map((t) => <Pill key={t} className="bg-surface-high text-ink-muted">{t}</Pill>)}
          </div>
          <h1 className="headline-xl mt-3">{r.title}</h1>
          {r.description ? <p className="mt-2 text-ink-muted">{r.description}</p> : null}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            {total ? <span className="inline-flex items-center gap-1"><Clock className="size-4" aria-hidden /> {minutesLabel(total)} total{r.prep_minutes ? ` · prep ${r.prep_minutes}` : ""}{r.cook_minutes ? ` · cook ${r.cook_minutes}` : ""}</span> : null}
            {r.rating ? <span className="inline-flex items-center gap-1" aria-label={`Rated ${r.rating} out of 5`}><Star className="size-4 fill-carbs text-carbs" aria-hidden /> {r.rating}/5</span> : null}
            {r.source_url ? <a href={r.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Source <ExternalLink className="size-3.5" aria-hidden /></a> : null}
          </p>
          {r.photos.length > 1 ? (
            <ul className="mt-3 flex gap-2 overflow-x-auto">{r.photos.slice(1).map((p) => <li key={p} className="relative size-16 shrink-0 overflow-hidden rounded-md"><Image src={publicImageUrl(p)} alt="" fill sizes="64px" className="object-cover" /></li>)}</ul>
          ) : null}
          <div className="mt-5"><RecipeActions id={r.id} title={r.title} servings={Number(r.servings)} shareSlug={r.share_slug} siteUrl={SITE_URL} books={(books ?? []).map((b) => ({ ...b, has: has.has(b.id) }))} /></div>
        </div>
      </div>
      <div className="mt-8"><RecipeView recipe={r} ingredients={ingredients} steps={steps} foodNames={foodNames} units={(profile?.units as "metric" | "us") ?? "metric"} /></div>
    </Container>
  );
}
