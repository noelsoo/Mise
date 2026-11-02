import type { Metadata } from "next";
import { Container } from "@/components/shell/page-header";
import { RecipeEditor, fromBlocks } from "@/components/recipe/recipe-editor";
import { loadRecipe } from "@/lib/data/recipe";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recipe: r, ingredients, steps, user } = await loadRecipe(id);
  return (
    <Container className="max-w-3xl">
      <RecipeEditor userId={user.id} heading="Edit recipe" initial={{
        id: r.id, title: r.title, description: r.description ?? "", servings: Number(r.servings),
        prep_minutes: r.prep_minutes?.toString() ?? "", cook_minutes: r.cook_minutes?.toString() ?? "",
        cuisine: r.cuisine ?? "", course: r.course ?? "", tags: r.tags.join(", "), notes: r.notes ?? "",
        source_url: r.source_url ?? "", rating: r.rating, favourite: r.favourite, photos: r.photos,
        ingredientsText: fromBlocks(ingredients.map((i) => ({ group: i.group_name, text: i.raw })), "\n"),
        stepsText: fromBlocks(steps.map((s) => ({ group: s.group_name, text: s.text })), "\n\n"),
      }} />
    </Container>
  );
}
