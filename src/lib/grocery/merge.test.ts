import { describe, it, expect } from 'vitest';
import { buildGroceryList, aisleFor, isStaple, regenerate, toShareText, type PlannedLine } from './merge';

const L = (o: Partial<PlannedLine>): PlannedLine => ({ name: 'onion', ingredientKey: 'onion', quantity: 1, unit: null, recipeTitle: 'A', servingsFactor: 1, ...o });

describe('buildGroceryList', () => {
  it('joins incompatible units', () => {
    const r = buildGroceryList([L({ quantity: 200, unit: 'g' }), L({ quantity: 1, unit: 'cup', recipeTitle: 'B' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: 'onion', quantityText: '200 g + 1 cup', sources: ['A', 'B'] });
  });
  it('sums mass and applies factor', () => {
    const r = buildGroceryList([L({ quantity: 500, unit: 'g' }), L({ quantity: 1, unit: 'kg', servingsFactor: 1 })]);
    expect(r[0].quantityText).toBe('1.5 kg');
    expect(buildGroceryList([L({ quantity: 100, unit: 'g', servingsFactor: 2 })])[0].quantityText).toBe('200 g');
  });
  it('sums counts', () => {
    expect(buildGroceryList([L({ quantity: 1 }), L({ quantity: 2 })])[0].quantityText).toBe('3');
  });
});

describe('aisle and staples', () => {
  it('uses food group then keywords', () => {
    expect(aisleFor('x', 'Dairy and Egg Products')).toBe('Dairy & eggs');
    expect(aisleFor('chicken thigh')).toBe('Meat & seafood');
    expect(aisleFor('mystery')).toBe('Other');
  });
  it('staples', () => {
    expect(isStaple('salt')).toBe(true);
    expect(isStaple('olive oil')).toBe(true);
    expect(isStaple('onion')).toBe(false);
  });
});

describe('regenerate', () => {
  const fresh = [{ mergeKey: 'a', name: 'a', quantityText: '1', aisle: 'Other' as const, isStaple: false, sources: [] }, { mergeKey: 'b', name: 'b', quantityText: '2', aisle: 'Other' as const, isStaple: false, sources: [] }];
  it('keeps manual, preserves checked', () => {
    const r = regenerate(
      [{ id: '1', mergeKey: 'a', isManual: false, checked: true }, { id: '2', mergeKey: 'gone', isManual: false, checked: false }, { id: '3', mergeKey: 'm', isManual: true, checked: false }],
      fresh,
    );
    expect(r.toDelete).toEqual(['2']);
    expect(r.toUpdate).toMatchObject([{ id: '1', checked: true }]);
    expect(r.toInsert.map((i) => i.mergeKey)).toEqual(['b']);
  });
});

describe('toShareText', () => {
  it('groups, skips checked, staples last', () => {
    const t = toShareText([
      { name: 'salt', quantityText: '', aisle: 'Spices & condiments', isStaple: true },
      { name: 'onion', quantityText: '2', aisle: 'Produce', isStaple: false },
      { name: 'milk', quantityText: '1 l', aisle: 'Dairy & eggs', isStaple: false, checked: true },
    ]);
    expect(t).toBe('Produce\n- onion (2)\n\nProbably have\n- salt');
  });
});
