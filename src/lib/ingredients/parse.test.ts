import { describe, it, expect } from 'vitest';
import { parseIngredientLine, parseIngredientBlock, ingredientKey } from './parse';

describe('parseIngredientLine', () => {
  it('parses no-space mass', () => {
    const p = parseIngredientLine('200g plain flour');
    expect(p).toMatchObject({ quantity: 200, unit: 'g', name: 'plain flour' });
  });
  it('parses unicode fractions and canonical unit', () => {
    expect(parseIngredientLine('½ cup milk')).toMatchObject({ quantity: 0.5, unit: 'cup', name: 'milk' });
    expect(parseIngredientLine('2 tablespoons olive oil')).toMatchObject({ unit: 'tbsp' });
  });
  it('parses ranges', () => {
    expect(parseIngredientLine('1-2 tbsp oil')).toMatchObject({ quantity: 1, quantity2: 2, unit: 'tbsp' });
    expect(parseIngredientLine('1 to 2 cloves garlic')).toMatchObject({ quantity: 1, quantity2: 2, unit: 'cloves' });
  });
  it('splits notes', () => {
    const p = parseIngredientLine('1 onion, finely chopped');
    expect(p.name).toBe('onion');
    expect(p.note).toBe('finely chopped');
    expect(parseIngredientLine('1 tsp chilli flakes (optional)')).toMatchObject({ name: 'chilli flakes', note: 'optional' });
  });
  it('handles multipacks', () => {
    const p = parseIngredientLine('2 x 400g cans chopped tomatoes');
    expect(p).toMatchObject({ quantity: 800, unit: 'g', name: 'chopped tomatoes', note: '2 x 400g' });
  });
  it('detects headers', () => {
    expect(parseIngredientLine('For the sauce').isGroupHeader).toBe(true);
    expect(parseIngredientLine('Marinade:')).toMatchObject({ isGroupHeader: true, name: 'Marinade' });
  });
  it('keeps size words in name but not key', () => {
    expect(parseIngredientLine('2 large eggs').name).toBe('eggs');
    expect(ingredientKey('Large Free-range Eggs')).toBe('free-range egg');
    expect(ingredientKey('Finely chopped fresh Parsley, to serve')).toBe('parsley');
    expect(ingredientKey('Onions')).toBe('onion');
    expect(ingredientKey('tomatoes')).toBe('tomato');
  });
  it('block skips blanks', () => {
    const r = parseIngredientBlock('For the base:\n\n200g flour\n  \n1 egg');
    expect(r.map((x) => x.isGroupHeader)).toEqual([true, false, false]);
  });
});
