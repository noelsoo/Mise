import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "@/lib/ingredients/parse";
import { toGrams, type Portion } from "@/lib/nutrition/grams";
import { computeRecipeNutrition, type Nutrients } from "@/lib/nutrition/compute";
import { candidateKeys } from "@/lib/nutrition/match";
import { displayQuantity } from "@/components/recipe/recipe-view";

// Real SR Legacy rows from the committed seed, so the pipeline is tested on actual data.
const foods = new Map<number, Nutrients>();
for (const line of readFileSync("supabase/seed/foods.tsv", "utf8").split("\n").slice(1)) {
  const f = line.split("\t");
  if (f.length < 11) continue;
  const n = (i: number) => (f[i] === "" ? null : Number(f[i]));
  foods.set(Number(f[0]), { kcal: n(3), protein_g: n(4), carbs_g: n(5), fat_g: n(6), fibre_g: n(7), sugar_g: n(8), sat_fat_g: n(9), sodium_mg: n(10) });
}
const portions = new Map<number, Portion[]>();
for (const line of readFileSync("supabase/seed/food_portions.tsv", "utf8").split("\n").slice(1)) {
  const [id, amount, unit, grams] = line.split("\t");
  if (!grams) continue;
  const list = portions.get(Number(id)) ?? [];
  list.push({ amount: Number(amount), unit, grams: Number(grams) });
  portions.set(Number(id), list);
}

function line(raw: string, foodId: number | null) {
  const p = parseIngredientLine(raw);
  const grams = foodId ? toGrams(p, portions.get(foodId) ?? []).grams : null;
  return { grams, per100: foodId ? foods.get(foodId)! : null };
}

describe("nutrition pipeline on seed data", () => {
  it("weighs common lines from USDA portion weights", () => {
    expect(line("2 eggs", 1123).grams).toBeCloseTo(88, 0); // 2 x medium 44 g
    expect(line("2 tbsp light soy sauce", 16123).grams).toBeCloseTo(32, 5);
    expect(line("3 cloves garlic, minced", 11215).grams).toBeCloseTo(9, 5);
    expect(line("1 cup jasmine rice", 20044).grams).toBeCloseTo(185, 5);
  });

  it("computes per-serving totals: sum(grams/100 x nutrient) / servings", () => {
    const n = computeRecipeNutrition([line("200 g rice", 20044), line("2 eggs", 1123)], 2);
    // rice 200 g = 730 kcal, eggs 88 g = 125.84 kcal -> 855.84 / 2
    expect(n.perServing.kcal).toBe(428);
    expect(n.counted).toBe(2);
    expect(n.isPartial).toBe(false);
  });

  it("never counts unknown as zero and flags partial totals", () => {
    const n = computeRecipeNutrition([line("200 g rice", 20044), line("1 bunch kangkong", null)], 1);
    expect(n.counted).toBe(1);
    expect(n.total).toBe(2);
    expect(n.isPartial).toBe(true);
    const none = computeRecipeNutrition([line("salt to taste", null)], 1);
    expect(none.perServing.kcal).toBeNull();
  });

  it("does not guess grams when there is no portion weight", () => {
    expect(line("1 bunch garlic", 11215).grams).toBeNull();
  });
});

describe("matching keys", () => {
  it("tries the full name first, then shorter tails", () => {
    expect(candidateKeys("light soy sauce")).toEqual(["light soy sauce", "soy sauce", "sauce"]);
    expect(candidateKeys("Salt to taste")[0]).toBe("salt");
  });
});

describe("display quantities", () => {
  it("scales and converts between metric and US", () => {
    expect(displayQuantity(200, null, "g", 2, "metric")).toBe("400 g");
    expect(displayQuantity(2, null, "tbsp", 1, "metric")).toBe("2 tbsp");
    expect(displayQuantity(250, null, "ml", 1, "us")).toMatch(/cup/);
    expect(displayQuantity(2, null, null, 1.5, "metric")).toBe("3");
  });
});
