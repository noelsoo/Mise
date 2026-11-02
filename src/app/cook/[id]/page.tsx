import type { Metadata } from "next";
import { CookMode } from "@/components/cook/cook-mode";
import { loadRecipe } from "@/lib/data/recipe";
import { getProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cook mode" };

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recipe, ingredients, steps } = await loadRecipe(id);
  const profile = await getProfile();
  return <CookMode recipe={recipe} ingredients={ingredients} steps={steps} units={(profile?.units as "metric" | "us") ?? "metric"} />;
}
