"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "./recipes";

const uuid = z.string().uuid();
const name = z.string().trim().min(1, "Name the cookbook.").max(80);

export async function createCookbook(input: { name: string; description?: string | null }): Promise<ActionResult<{ id: string }>> {
  const p = z.object({ name, description: z.string().trim().max(500).nullish() }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid cookbook." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("cookbooks").insert({ name: p.data.name, description: p.data.description || null }).select("id").single();
  if (error || !data) return { ok: false, error: "Couldn't create the cookbook." };
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id } };
}

export async function renameCookbook(id: string, input: { name: string; description?: string | null }): Promise<ActionResult> {
  const p = z.object({ id: uuid, name, description: z.string().trim().max(500).nullish() }).safeParse({ id, ...input });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid cookbook." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cookbooks").update({ name: p.data.name, description: p.data.description || null }).eq("id", id);
  revalidatePath("/", "layout");
  return error ? { ok: false, error: "Couldn't rename." } : { ok: true };
}

export async function deleteCookbook(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid cookbook." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cookbooks").delete().eq("id", id);
  revalidatePath("/", "layout");
  return error ? { ok: false, error: "Couldn't delete." } : { ok: true };
}

export async function setRecipeInCookbook(cookbookId: string, recipeId: string, inBook: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(cookbookId).success || !uuid.safeParse(recipeId).success) return { ok: false, error: "Invalid." };
  const { supabase } = await requireUser();
  if (inBook) {
    const { count } = await supabase.from("cookbook_recipes").select("recipe_id", { count: "exact", head: true }).eq("cookbook_id", cookbookId);
    const { error } = await supabase.from("cookbook_recipes").upsert({ cookbook_id: cookbookId, recipe_id: recipeId, position: count ?? 0 }, { onConflict: "cookbook_id,recipe_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: "Couldn't add to the cookbook." };
  } else {
    const { error } = await supabase.from("cookbook_recipes").delete().eq("cookbook_id", cookbookId).eq("recipe_id", recipeId);
    if (error) return { ok: false, error: "Couldn't remove from the cookbook." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reorderCookbook(cookbookId: string, recipeIds: string[]): Promise<ActionResult> {
  const p = z.object({ c: uuid, ids: z.array(uuid).max(1000) }).safeParse({ c: cookbookId, ids: recipeIds });
  if (!p.success) return { ok: false, error: "Invalid order." };
  const { supabase } = await requireUser();
  const results = await Promise.all(p.data.ids.map((rid, i) => supabase.from("cookbook_recipes").update({ position: i }).eq("cookbook_id", cookbookId).eq("recipe_id", rid)));
  revalidatePath(`/cookbooks/${cookbookId}`);
  return results.some((r) => r.error) ? { ok: false, error: "Couldn't save the order." } : { ok: true };
}
