import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomFoodRow, Database, FoodRow } from "@/lib/supabase/database.types";
import { ingredientKey } from "@/lib/ingredients/parse";
import { toGrams, type Portion } from "./grams";
import type { Nutrients } from "./compute";

type Client = SupabaseClient<Database>;
export type MatchSource = "fix" | "custom" | "alias" | "search" | "manual";

export type Match = {
  foodId: number | null;
  customFoodId: string | null;
  source: MatchSource;
  per100: Nutrients;
  foodName: string;
  foodGroup: string | null;
  portions: Portion[];
};

const NUTRIENTS = ["kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "sugar_g", "sat_fat_g", "sodium_mg"] as const;
const pick = (r: Partial<Record<(typeof NUTRIENTS)[number], number | null>>): Nutrients =>
  Object.fromEntries(NUTRIENTS.map((k) => [k, r[k] == null ? null : Number(r[k])])) as Nutrients;

const NOISE = /\b(to taste|as needed|for garnish|for serving|optional|or more|plus extra|divided)\b/g;

/** Candidate lookup keys, most specific first: "light soy sauce" -> ["light soy sauce", "soy sauce", "sauce"]. */
export function candidateKeys(name: string): string[] {
  const base = ingredientKey(name.toLowerCase().replace(NOISE, " ")).replace(/\s+/g, " ").trim();
  if (!base) return [];
  const words = base.split(" ");
  const keys = [base];
  for (let i = 1; i < words.length; i++) keys.push(words.slice(i).join(" "));
  return [...new Set(keys)];
}

/**
 * Resolve many ingredient names at once. Order per name:
 * the user's saved fix, their custom foods, local aliases, then fuzzy search.
 * Returns null for a name when nothing reasonable matches (it stays uncounted).
 */
export async function matchIngredients(supabase: Client, names: string[]): Promise<Map<string, Match | null>> {
  const result = new Map<string, Match | null>();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!unique.length) return result;

  const keysByName = new Map(unique.map((n) => [n, candidateKeys(n)]));
  const allKeys = [...new Set([...keysByName.values()].flat())];

  const [{ data: fixes }, { data: customs }, { data: aliases }] = await Promise.all([
    supabase.from("food_matches").select("ingredient_key, food_id, custom_food_id").in("ingredient_key", allKeys),
    supabase.from("custom_foods").select("*"),
    supabase.from("food_aliases").select("alias, food_id").in("alias", allKeys),
  ]);
  const fixMap = new Map((fixes ?? []).map((f) => [f.ingredient_key, f]));
  const customByName = new Map((customs ?? []).map((c) => [c.name.toLowerCase(), c]));
  const customById = new Map((customs ?? []).map((c) => [c.id, c]));
  const aliasMap = new Map((aliases ?? []).map((a) => [a.alias, a.food_id]));

  const chosen = new Map<string, { foodId?: number; custom?: CustomFoodRow; source: MatchSource }>();
  const needSearch: string[] = [];
  for (const [name, keys] of keysByName) {
    let hit: { foodId?: number; custom?: CustomFoodRow; source: MatchSource } | null = null;
    // Saved fix applies to the full key only, so "soy sauce" fixes don't leak into "sauce".
    const fix = fixMap.get(keys[0]);
    if (fix) hit = fix.custom_food_id ? { custom: customById.get(fix.custom_food_id), source: "fix" } : { foodId: fix.food_id ?? undefined, source: "fix" };
    if (!hit) for (const k of keys) { const c = customByName.get(k); if (c) { hit = { custom: c, source: "custom" }; break; } }
    if (!hit) for (const k of keys) { const id = aliasMap.get(k); if (id) { hit = { foodId: id, source: "alias" }; break; } }
    if (hit && (hit.foodId || hit.custom)) chosen.set(name, hit);
    else needSearch.push(name);
  }

  // Fuzzy search runs per name; capped to keep a big recipe import quick.
  await Promise.all(needSearch.slice(0, 60).map(async (name) => {
    const q = keysByName.get(name)?.[0];
    if (!q || q.length < 3) return;
    const { data } = await supabase.rpc("search_foods", { q, max_results: 1 });
    const top = data?.[0];
    // Strict on purpose: a wrong match is worse than an uncounted line the user can fix.
    if (top && top.score > 0.55) chosen.set(name, { foodId: top.id, source: "search" });
  }));

  const foodIds = [...new Set([...chosen.values()].map((c) => c.foodId).filter((x): x is number => !!x))];
  const [{ data: foods }, { data: portions }] = foodIds.length
    ? await Promise.all([
        supabase.from("foods").select("*").in("id", foodIds),
        supabase.from("food_portions").select("food_id, amount, unit, grams").in("food_id", foodIds),
      ])
    : [{ data: [] as FoodRow[] }, { data: [] as { food_id: number; amount: number; unit: string; grams: number }[] }];
  const foodMap = new Map((foods ?? []).map((f) => [f.id, f]));
  const portionMap = new Map<number, Portion[]>();
  for (const p of portions ?? []) {
    const list = portionMap.get(p.food_id) ?? [];
    list.push({ amount: Number(p.amount), unit: p.unit, grams: Number(p.grams) });
    portionMap.set(p.food_id, list);
  }

  for (const name of unique) {
    const c = chosen.get(name);
    if (c?.custom) {
      const cf = c.custom;
      result.set(name, {
        foodId: null, customFoodId: cf.id, source: c.source, per100: pick(cf), foodName: cf.brand ? `${cf.name} (${cf.brand})` : cf.name, foodGroup: null,
        portions: cf.serving_g ? [{ amount: 1, unit: "serving", grams: Number(cf.serving_g) }] : [],
      });
    } else if (c?.foodId && foodMap.has(c.foodId)) {
      const f = foodMap.get(c.foodId)!;
      result.set(name, { foodId: f.id, customFoodId: null, source: c.source, per100: pick(f), foodName: f.name, foodGroup: f.food_group, portions: portionMap.get(f.id) ?? [] });
    } else {
      result.set(name, null);
    }
  }
  return result;
}

export type ResolvedLine = {
  grams: number | null;
  match: Match | null;
  reason?: string;
};

/** Grams for one parsed line. A manual grams override wins; otherwise never guess. */
export function resolveGrams(line: { quantity: number | null; unit: string | null; name: string }, match: Match | null, manualGrams?: number | null): ResolvedLine {
  if (!match) return { grams: null, match: null, reason: "No matching food" };
  if (manualGrams != null && manualGrams >= 0) return { grams: manualGrams, match };
  const r = toGrams(line, match.portions);
  return { grams: r.grams, match, reason: r.reason };
}
