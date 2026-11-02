import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export async function loadRecipe(id: string) {
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, user } = await requireUser();
  const [{ data: recipe }, { data: ingredients }, { data: steps }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).maybeSingle(),
    supabase.from("ingredients").select("*").eq("recipe_id", id).order("position"),
    supabase.from("steps").select("*").eq("recipe_id", id).order("position"),
  ]);
  if (!recipe) notFound();
  return { recipe, ingredients: ingredients ?? [], steps: steps ?? [], user, supabase };
}
