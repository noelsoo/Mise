"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, IngredientRow } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/supabase/server";
import { ingredientKey, parseIngredientLine } from "@/lib/ingredients/parse";
import { computeRecipeNutrition, type Nutrients } from "@/lib/nutrition/compute";
import { matchIngredients, resolveGrams } from "@/lib/nutrition/match";

type Client = SupabaseClient<Database>;
export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const str = (max: number) => z.preprocess((v) => (typeof v === "string" ? v.trim() || null : v ?? null), z.string().max(max).nullable());
const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(10000).nullable());

const recipeInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Give the recipe a title.").max(200),
  description: str(2000),
  servings: z.coerce.number().positive().max(100),
  prep_minutes: optInt,
  cook_minutes: optInt,
  cuisine: str(60),
  course: str(60),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  notes: str(10000),
  source_url: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), "Use an http(s) link.").nullable()),
  rating: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(5).nullable()),
  favourite: z.boolean().default(false),
  photos: z.array(z.string().max(300)).max(10).default([]),
  ingredients: z.array(z.object({
    group: str(80),
    raw: z.string().trim().min(1).max(300),
    grams: z.number().min(0).max(100000).nullable().optional(),
  })).max(200),
  steps: z.array(z.object({ group: str(80), text: z.string().trim().min(1).max(4000) })).max(100),
});
export type RecipeInput = z.input<typeof recipeInput>;

type Line = { raw: string; group: string | null; position: number; parsed: ReturnType<typeof parseIngredientLine>; manualGrams: number | null; prior?: Pick<IngredientRow, "food_id" | "custom_food_id" | "match_source"> };

/** Parse, match and weigh every line, then return ingredient rows and the per-serving totals. */
async function buildIngredients(supabase: Client, lines: Line[], servings: number) {
  const matches = await matchIngredients(supabase, lines.map((l) => l.parsed.name));
  const rows = lines.map((l) => {
    const match = matches.get(l.parsed.name.trim()) ?? null;
    const { grams } = resolveGrams(l.parsed, match, l.manualGrams);
    const counted = grams != null && match != null;
    return {
      row: {
        position: l.position, group_name: l.group, raw: l.raw,
        quantity: l.parsed.quantity, quantity2: l.parsed.quantity2, unit: l.parsed.unit,
        name: l.parsed.name.slice(0, 200), note: l.parsed.note?.slice(0, 200) ?? null,
        food_id: match?.foodId ?? null, custom_food_id: match?.customFoodId ?? null,
        grams: grams == null ? null : Math.round(grams * 10) / 10,
        match_source: l.manualGrams != null ? "manual" : match?.source ?? null,
        counted,
      },
      per100: match?.per100 ?? null,
    };
  });
  const nutrition = computeRecipeNutrition(rows.map((r) => ({ grams: r.row.grams, per100: r.per100 })), servings);
  return { rows: rows.map((r) => r.row), nutrition };
}

function nutritionColumns(n: ReturnType<typeof computeRecipeNutrition>) {
  return { ...n.perServing, counted_count: n.counted, ingredient_count: n.total };
}

export async function saveRecipe(input: RecipeInput): Promise<ActionResult<{ id: string }>> {
  const parsed = recipeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { supabase, user } = await requireUser();
  const d = parsed.data;

  // Photos must live in the caller's own storage folder (blocks pointing at other users' files).
  if (d.photos.some((p) => !p.startsWith(`${user.id}/`) || p.includes(".."))) return { ok: false, error: "Invalid photo." };

  // Keep manual gram overrides on lines the user didn't change.
  const prior = new Map<string, number | null>();
  if (d.id) {
    const { data: old } = await supabase.from("ingredients").select("raw, grams, match_source").eq("recipe_id", d.id);
    old?.forEach((o) => { if (o.match_source === "manual") prior.set(o.raw, o.grams); });
  }

  const lines: Line[] = d.ingredients.map((ing, i) => ({
    raw: ing.raw, group: ing.group, position: i, parsed: parseIngredientLine(ing.raw),
    manualGrams: ing.grams ?? prior.get(ing.raw) ?? null,
  })).filter((l) => !l.parsed.isGroupHeader);

  const { rows, nutrition } = await buildIngredients(supabase, lines, d.servings);
  const recipe = {
    title: d.title, description: d.description, servings: d.servings, prep_minutes: d.prep_minutes, cook_minutes: d.cook_minutes,
    cuisine: d.cuisine, course: d.course, tags: [...new Set(d.tags)], notes: d.notes, source_url: d.source_url,
    rating: d.rating, favourite: d.favourite, photos: d.photos, ...nutritionColumns(nutrition),
  };

  let id = d.id;
  if (id) {
    const { error } = await supabase.from("recipes").update(recipe).eq("id", id);
    if (error) return { ok: false, error: "Couldn't save the recipe." };
    await supabase.from("ingredients").delete().eq("recipe_id", id);
    await supabase.from("steps").delete().eq("recipe_id", id);
  } else {
    const { data, error } = await supabase.from("recipes").insert(recipe).select("id").single();
    if (error || !data) return { ok: false, error: "Couldn't save the recipe." };
    id = data.id;
  }
  const recipeId = id;
  if (rows.length) {
    const { error } = await supabase.from("ingredients").insert(rows.map((r) => ({ ...r, recipe_id: recipeId })));
    if (error) return { ok: false, error: "Saved the recipe, but not its ingredients. Try saving again." };
  }
  if (d.steps.length) {
    const { error } = await supabase.from("steps").insert(d.steps.map((s, i) => ({ recipe_id: recipeId, position: i, group_name: s.group, text: s.text })));
    if (error) return { ok: false, error: "Saved the recipe, but not its steps. Try saving again." };
  }
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true, data: { id: recipeId } };
}

/** Recalculate cached nutrition from the stored ingredient rows. */
async function recompute(supabase: Client, recipeId: string) {
  const [{ data: recipe }, { data: ings }] = await Promise.all([
    supabase.from("recipes").select("servings").eq("id", recipeId).single(),
    supabase.from("ingredients").select("*").eq("recipe_id", recipeId),
  ]);
  if (!recipe || !ings) return;
  const foodIds = ings.map((i) => i.food_id).filter((x): x is number => x != null);
  const customIds = ings.map((i) => i.custom_food_id).filter((x): x is string => x != null);
  const [{ data: foods }, { data: customs }] = await Promise.all([
    foodIds.length ? supabase.from("foods").select("*").in("id", foodIds) : Promise.resolve({ data: [] }),
    customIds.length ? supabase.from("custom_foods").select("*").in("id", customIds) : Promise.resolve({ data: [] }),
  ]);
  const per = new Map<string, Nutrients>();
  (foods ?? []).forEach((f) => per.set(`f${f.id}`, f as Nutrients));
  (customs ?? []).forEach((c) => per.set(`c${c.id}`, c as unknown as Nutrients));
  const n = computeRecipeNutrition(ings.map((i) => ({
    grams: i.grams,
    per100: i.food_id ? per.get(`f${i.food_id}`) ?? null : i.custom_food_id ? per.get(`c${i.custom_food_id}`) ?? null : null,
  })), Number(recipe.servings));
  await supabase.from("recipes").update(nutritionColumns(n)).eq("id", recipeId);
}

const fixInput = z.object({
  ingredientId: z.string().uuid(),
  foodId: z.number().int().positive().nullable(),
  customFoodId: z.string().uuid().nullable(),
  grams: z.number().min(0).max(100000).nullable(),
  remember: z.boolean(),
});

/** Fix one ingredient's match (and optionally its weight); remember the fix for next time. */
export async function fixIngredient(input: z.input<typeof fixInput>): Promise<ActionResult> {
  const p = fixInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid fix." };
  const { supabase } = await requireUser();
  const { ingredientId, foodId, customFoodId, grams, remember } = p.data;
  const { data: ing } = await supabase.from("ingredients").select("*").eq("id", ingredientId).single();
  if (!ing) return { ok: false, error: "Ingredient not found." };

  let finalGrams = grams;
  if (finalGrams == null && (foodId || customFoodId)) {
    // Re-weigh with the new food's portions.
    const portions = foodId
      ? ((await supabase.from("food_portions").select("amount, unit, grams").eq("food_id", foodId)).data ?? [])
      : [];
    const custom = customFoodId ? (await supabase.from("custom_foods").select("serving_g").eq("id", customFoodId).single()).data : null;
    const { toGrams } = await import("@/lib/nutrition/grams");
    finalGrams = toGrams(ing, [
      ...portions.map((x) => ({ amount: Number(x.amount), unit: x.unit, grams: Number(x.grams) })),
      ...(custom?.serving_g ? [{ amount: 1, unit: "serving", grams: Number(custom.serving_g) }] : []),
    ]).grams;
  }
  const { error } = await supabase.from("ingredients").update({
    food_id: foodId, custom_food_id: customFoodId, grams: finalGrams,
    match_source: grams != null ? "manual" : "fix", counted: finalGrams != null && (foodId != null || customFoodId != null),
  }).eq("id", ingredientId);
  if (error) return { ok: false, error: "Couldn't save the fix." };

  if (remember && (foodId || customFoodId)) {
    const key = ingredientKey(ing.name);
    if (key) await supabase.from("food_matches").upsert({ ingredient_key: key, food_id: foodId, custom_food_id: customFoodId }, { onConflict: "user_id,ingredient_key" });
  }
  await recompute(supabase, ing.recipe_id);
  revalidatePath(`/recipes/${ing.recipe_id}`);
  return { ok: true };
}

export async function searchFoods(q: string) {
  const query = z.string().trim().min(2).max(80).safeParse(q);
  if (!query.success) return { foods: [], custom: [] };
  const { supabase } = await requireUser();
  const [{ data: foods }, { data: custom }] = await Promise.all([
    supabase.rpc("search_foods", { q: query.data, max_results: 12 }),
    supabase.from("custom_foods").select("id, name, brand, kcal").ilike("name", `%${query.data.replace(/[%_\\]/g, "")}%`).limit(5),
  ]);
  return { foods: foods ?? [], custom: custom ?? [] };
}

const idSchema = z.string().uuid();

export async function deleteRecipe(id: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid recipe." };
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("recipes").select("photos").eq("id", id).single();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the recipe." };
  const own = (data?.photos ?? []).filter((p) => p.startsWith(`${user.id}/`));
  if (own.length) await supabase.storage.from("recipe-images").remove(own);
  revalidatePath("/recipes");
  return { ok: true };
}

export async function duplicateRecipe(id: string): Promise<ActionResult<{ id: string }>> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid recipe." };
  const { supabase } = await requireUser();
  const [{ data: r }, { data: ings }, { data: steps }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).single(),
    supabase.from("ingredients").select("*").eq("recipe_id", id).order("position"),
    supabase.from("steps").select("*").eq("recipe_id", id).order("position"),
  ]);
  if (!r) return { ok: false, error: "Recipe not found." };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, user_id, created_at, updated_at, share_slug, last_opened_at, ...rest } = r;
  const { data: copy, error } = await supabase.from("recipes").insert({ ...rest, title: `${r.title} (copy)`.slice(0, 200), photos: [] }).select("id").single();
  if (error || !copy) return { ok: false, error: "Couldn't duplicate the recipe." };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (ings?.length) await supabase.from("ingredients").insert(ings.map(({ id: _i, user_id: _u, ...i }) => ({ ...i, recipe_id: copy.id })));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (steps?.length) await supabase.from("steps").insert(steps.map(({ id: _i, user_id: _u, ...s }) => ({ ...s, recipe_id: copy.id })));
  void user_id; void created_at; void updated_at; void share_slug; void last_opened_at;
  revalidatePath("/recipes");
  return { ok: true, data: { id: copy.id } };
}

export async function setFavourite(id: string, favourite: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid recipe." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recipes").update({ favourite: Boolean(favourite) }).eq("id", id);
  revalidatePath("/recipes");
  return error ? { ok: false, error: "Couldn't update." } : { ok: true };
}

export async function setRating(id: string, rating: number | null): Promise<ActionResult> {
  const r = z.number().int().min(1).max(5).nullable().safeParse(rating);
  if (!idSchema.safeParse(id).success || !r.success) return { ok: false, error: "Invalid rating." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recipes").update({ rating: r.data }).eq("id", id);
  revalidatePath(`/recipes/${id}`);
  return error ? { ok: false, error: "Couldn't update." } : { ok: true };
}

export async function markOpened(id: string) {
  if (!idSchema.safeParse(id).success) return;
  const { supabase } = await requireUser();
  await supabase.from("recipes").update({ last_opened_at: new Date().toISOString() }).eq("id", id);
}

/** Turn the public read-only link on (new unguessable slug) or off. */
export async function setSharing(id: string, on: boolean): Promise<ActionResult<{ slug: string | null }>> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid recipe." };
  const { supabase } = await requireUser();
  const slug = on ? randomUUID() : null;
  const { error } = await supabase.from("recipes").update({ share_slug: slug }).eq("id", id);
  revalidatePath(`/recipes/${id}`);
  return error ? { ok: false, error: "Couldn't update sharing." } : { ok: true, data: { slug } };
}
