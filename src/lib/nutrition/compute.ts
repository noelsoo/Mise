export type Nutrients = {
  kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null;
  fibre_g: number | null; sugar_g: number | null; sat_fat_g: number | null; sodium_mg: number | null;
};
export type NutrientKey = keyof Nutrients;
export const NUTRIENT_KEYS: NutrientKey[] = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g', 'sugar_g', 'sat_fat_g', 'sodium_mg'];

export type NutritionResult = {
  perServing: Record<NutrientKey, number | null>;
  counted: number;
  total: number;
  isPartial: boolean;
  /** Nutrients where at least one counted food had no data. */
  partialKeys: Set<NutrientKey>;
};

const round = (k: NutrientKey, v: number) => (k === 'kcal' || k === 'sodium_mg' ? Math.round(v) : Math.round(v * 10) / 10);

export function computeRecipeNutrition(
  lines: { grams: number | null; per100: Nutrients | null }[],
  servings: number,
): NutritionResult {
  const sums = {} as Record<NutrientKey, number | null>;
  const partialKeys = new Set<NutrientKey>();
  for (const k of NUTRIENT_KEYS) sums[k] = null;
  let counted = 0;
  for (const l of lines) {
    if (l.grams == null || l.per100 == null) continue;
    counted++;
    for (const k of NUTRIENT_KEYS) {
      const n = l.per100[k];
      if (n == null) partialKeys.add(k);
      else sums[k] = (sums[k] ?? 0) + (l.grams / 100) * n;
    }
  }
  const div = servings > 0 ? servings : 1;
  const perServing = {} as Record<NutrientKey, number | null>;
  for (const k of NUTRIENT_KEYS) perServing[k] = sums[k] == null ? null : round(k, sums[k]! / div);
  return { perServing, counted, total: lines.length, isPartial: counted < lines.length || partialKeys.size > 0, partialKeys };
}

export function formatAtLeast(value: number | null, isPartial: boolean): string {
  if (value == null) return '–';
  return isPartial ? `at least ${value}` : String(value);
}
