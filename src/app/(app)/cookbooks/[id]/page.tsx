import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Container } from "@/components/shell/page-header";
import { CookbookDetail } from "@/components/cookbooks";
import type { CardRecipe } from "@/components/recipe/recipe-card";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cookbook" };

export default async function CookbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireUser();
  const [{ data: book }, { data: links }] = await Promise.all([
    supabase.from("cookbooks").select("id, name, description").eq("id", id).maybeSingle(),
    supabase.from("cookbook_recipes").select("position, recipes(id, title, photos, prep_minutes, cook_minutes, kcal, protein_g, carbs_g, fat_g, servings, favourite, counted_count, ingredient_count)").eq("cookbook_id", id).order("position"),
  ]);
  if (!book) notFound();
  const recipes = (links ?? []).map((l) => l.recipes as unknown as CardRecipe).filter(Boolean);
  return <Container><CookbookDetail key={recipes.map((r) => r.id).join()} book={book} recipes={recipes} /></Container>;
}
