import { describe, it, expect } from 'vitest';
import { toGrams } from './grams';

const flour = [{ amount: 1, unit: 'cup', grams: 125 }, { amount: 1, unit: 'tbsp', grams: 8 }];
const egg = [{ amount: 1, unit: 'large', grams: 50 }, { amount: 1, unit: 'medium', grams: 44 }, { amount: 1, unit: 'cup', grams: 243 }];
const garlic = [{ amount: 1, unit: 'clove', grams: 3 }, { amount: 1, unit: 'tsp', grams: 2.8 }];
const L = (quantity: number | null, unit: string | null, name = 'x') => ({ quantity, unit, name });

describe('toGrams', () => {
  it('mass direct', () => expect(toGrams(L(2, 'kg'), []).grams).toBe(2000));
  it('no quantity', () => expect(toGrams(L(null, 'g'), [])).toEqual({ grams: null, reason: 'no quantity' }));
  it('exact volume portion', () => expect(toGrams(L(2, 'cups'), flour).grams).toBe(250));
  it('qualified portion label', () => {
    expect(toGrams(L(1, 'cup'), [{ amount: 1, unit: 'cup, chopped', grams: 160 }]).grams).toBe(160);
    expect(toGrams(L(2, 'cup'), [{ amount: 1, unit: 'cup (8 fl oz)', grams: 240 }]).grams).toBe(480);
  });
  it('converts via other volume', () => {
    expect(toGrams(L(1, 'tbsp'), [{ amount: 1, unit: 'cup', grams: 236.588 }]).grams).toBeCloseTo(14.787, 2);
    expect(toGrams(L(100, 'ml'), flour).grams).toBeCloseTo((100 / 236.588) * 125, 3);
  });
  it('fails without volume portion', () => expect(toGrams(L(1, 'cup'), [garlic[0]]).grams).toBeNull());
  it('count prefers medium', () => {
    expect(toGrams(L(2, null), egg).grams).toBe(88);
    expect(toGrams(L(2, 'large'), egg).grams).toBe(100);
  });
  it('cloves', () => expect(toGrams(L(3, 'cloves'), garlic).grams).toBe(9));
  it('count without portions is null', () => expect(toGrams(L(1, null), flour).grams).toBeNull());
});
