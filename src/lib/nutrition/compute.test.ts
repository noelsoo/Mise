import { describe, it, expect } from 'vitest';
import { computeRecipeNutrition, formatAtLeast, type Nutrients } from './compute';

const n = (o: Partial<Nutrients>): Nutrients => ({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sat_fat_g: 0, sodium_mg: 0, ...o });

describe('computeRecipeNutrition', () => {
  it('sums per serving', () => {
    const r = computeRecipeNutrition([{ grams: 200, per100: n({ kcal: 100, protein_g: 5 }) }, { grams: 100, per100: n({ kcal: 50.4 }) }], 2);
    expect(r.perServing.kcal).toBe(125);
    expect(r.perServing.protein_g).toBe(5);
    expect(r).toMatchObject({ counted: 2, total: 2, isPartial: false });
  });
  it('uncounted lines make it partial, never zero', () => {
    const r = computeRecipeNutrition([{ grams: null, per100: n({}) }, { grams: 100, per100: null }], 1);
    expect(r.perServing.kcal).toBeNull();
    expect(r).toMatchObject({ counted: 0, total: 2, isPartial: true });
  });
  it('null nutrient marks key partial', () => {
    const r = computeRecipeNutrition([{ grams: 100, per100: n({ kcal: 100, sugar_g: null }) }], 1);
    expect(r.perServing.sugar_g).toBeNull();
    expect(r.partialKeys.has('sugar_g')).toBe(true);
    expect(r.partialKeys.has('kcal')).toBe(false);
    expect(r.isPartial).toBe(true);
  });
  it('formats', () => {
    expect(formatAtLeast(420, true)).toBe('at least 420');
    expect(formatAtLeast(420, false)).toBe('420');
    expect(formatAtLeast(null, true)).toBe('–');
  });
});
