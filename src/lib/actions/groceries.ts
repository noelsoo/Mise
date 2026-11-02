"use server";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { z } from "zod";
import { requireUser, getProfile } from "@/lib/supabase/server";
import { aisleFor, buildGroceryList, isStaple, regenerate, type PlannedLine } from "@/lib/grocery/merge";
import { ingredientKey } from "@/lib/ingredients/parse";
import { parseLocalDate, toYmd } from "@/lib/utils";
import type { ActionResult } from "./recipes";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Rebuild the list from a week's plan. Manual items and ticks on surviving lines are kept. */
export async function generateFromPlan(weekStart: string): Promise<ActionResult<{ added: number; updated: number; removed: number }>> {
  if (!ymd.safeParse(weekStart).success) return { ok: false, error: "Invalid week." };
  const { supabase } = await requireUser();
  const profile = await getProfile();
  const end = toYmd(addDays(parseLocalDate(weekStart), 6));
  const { data: entries, error } = await supabase.from("meal_plan_entries")
    .select("servings, recipes(id, title, servings, ingredients(name, quantity, quantity2, unit, food_id, foods(food_group)))")
    .gte("date", weekStart).lte("date", end).not("recipe_id", "is", null);
  if (error) return { ok: false, error: "Couldn't read the plan." };

  type Ing = { name: string; quantity: number | null; quantity2: number | null; unit: string | null; foods: { food_group: string } | null };
  type R = { id: string; title: string; servings: number; ingredients: Ing[] };
  const lines: PlannedLine[] = [];
  for (const e of entries ?? []) {
    const r = e.recipes as unknown as R | null;
    if (!r) continue;
    const factor = Number(e.servings ?? r.servings) / Number(r.servings || 1);
    for (const ing of r.ingredients ?? []) {
      if (!ing.name) continue;
      // For a range like "2-3", shop for the top of the range.
      const qty = ing.quantity2 ?? ing.quantity;
      lines.push({ name: ing.name, ingredientKey: ingredientKey(ing.name) || ing.name.toLowerCase(), quantity: qty, unit: ing.unit, recipeTitle: r.title, servingsFactor: factor, aisleHint: ing.foods?.food_group ?? null });
    }
  }
  const fresh = buildGroceryList(lines, { system: (profile?.units as "metric" | "us") ?? "metric" });

  const { data: existing } = await supabase.from("grocery_items").select("*");
  const plan = regenerate((existing ?? []).map((x) => ({ id: x.id, mergeKey: x.merge_key ?? `manual:${x.id}`, isManual: x.is_manual, checked: x.checked })), fresh);

  if (plan.toDelete.length) await supabase.from("grocery_items").delete().in("id", plan.toDelete);
  const row = (f: (typeof fresh)[number], i: number) => ({ name: f.name, quantity_text: f.quantityText || null, aisle: f.aisle, merge_key: f.mergeKey, is_staple: f.isStaple, sources: f.sources.slice(0, 20), is_manual: false, position: i });
  if (plan.toInsert.length) {
    const { error: e } = await supabase.from("grocery_items").insert(plan.toInsert.map(row));
    if (e) return { ok: false, error: "Couldn't save the list." };
  }
  await Promise.all(plan.toUpdate.map((u, i) => supabase.from("grocery_items").update({ ...row(u, i), checked: u.checked }).eq("id", u.id)));
  revalidatePath("/groceries");
  return { ok: true, data: { added: plan.toInsert.length, updated: plan.toUpdate.length, removed: plan.toDelete.length } };
}

export async function addManualItem(input: { name: string; quantity?: string }): Promise<ActionResult<{ id: string; aisle: string; staple: boolean }>> {
  const p = z.object({ name: z.string().trim().min(1, "Type an item.").max(200), quantity: z.string().trim().max(200).optional() }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid item." };
  const { supabase } = await requireUser();
  const aisle = aisleFor(p.data.name);
  const staple = isStaple(ingredientKey(p.data.name));
  const { data, error } = await supabase.from("grocery_items").insert({ name: p.data.name, quantity_text: p.data.quantity || null, aisle, is_manual: true, is_staple: staple }).select("id").single();
  revalidatePath("/groceries");
  return error || !data ? { ok: false, error: "Couldn't add the item." } : { ok: true, data: { id: data.id, aisle, staple } };
}

export async function setChecked(id: string, checked: boolean): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid item." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("grocery_items").update({ checked: Boolean(checked) }).eq("id", id);
  return error ? { ok: false, error: "Couldn't update." } : { ok: true };
}

export async function deleteItems(ids: string[]): Promise<ActionResult> {
  const p = z.array(z.string().uuid()).max(1000).safeParse(ids);
  if (!p.success) return { ok: false, error: "Invalid items." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("grocery_items").delete().in("id", p.data);
  revalidatePath("/groceries");
  return error ? { ok: false, error: "Couldn't remove." } : { ok: true };
}
