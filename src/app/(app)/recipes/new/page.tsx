import type { Metadata } from "next";
import { Container } from "@/components/shell/page-header";
import { RecipeEditor, emptyEditor } from "@/components/recipe/recipe-editor";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New recipe" };

export default async function NewRecipePage() {
  const { user } = await requireUser();
  return <Container className="max-w-3xl"><RecipeEditor initial={emptyEditor} userId={user.id} heading="New recipe" /></Container>;
}
