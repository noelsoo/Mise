import { describe, it, expect } from 'vitest';
import { normaliseUnit, toGramsDirect, toMl, formatQuantity, scaleQuantity, toFraction } from './units';

describe('units', () => {
  it('normalises aliases', () => {
    expect(normaliseUnit('tablespoons')).toBe('tbsp');
    expect(normaliseUnit('Tbsp')).toBe('tbsp');
    expect(normaliseUnit('T')).toBe('tbsp');
    expect(normaliseUnit('t')).toBe('tsp');
    expect(normaliseUnit('c')).toBe('cup');
    expect(normaliseUnit('grams')).toBe('g');
    expect(normaliseUnit('gm')).toBe('g');
    expect(normaliseUnit('Litre')).toBe('l');
    expect(normaliseUnit('liter')).toBe('l');
    expect(normaliseUnit('millilitre')).toBe('ml');
    expect(normaliseUnit('fl oz')).toBe('fl oz');
    expect(normaliseUnit('clove')).toBeNull();
    expect(normaliseUnit(null)).toBeNull();
  });
  it('converts', () => {
    expect(toGramsDirect(2, 'kg')).toBe(2000);
    expect(toGramsDirect(1, 'cup')).toBeNull();
    expect(toMl(1, 'cup')).toBeCloseTo(236.588);
    expect(toMl(1, 'g')).toBeNull();
  });
  it('formats metric', () => {
    expect(formatQuantity(1500, 'g', 'metric')).toBe('1.5 kg');
    expect(formatQuantity(250, 'g', 'metric')).toBe('250 g');
    expect(formatQuantity(1, 'tbsp', 'metric')).toBe('15 ml');
    expect(formatQuantity(1, 'cup', 'metric')).toBe('235 ml');
    expect(formatQuantity(1.5, 'l', 'metric')).toBe('1.5 l');
  });
  it('formats us', () => {
    expect(formatQuantity(454, 'g', 'us')).toBe('1 lb');
    expect(formatQuantity(100, 'g', 'us')).toBe('3.53 oz');
    expect(formatQuantity(0.5, 'cup', 'us')).toBe('½ cup');
    expect(formatQuantity(1.5, 'tbsp', 'us')).toBe('1½ tbsp');
    expect(formatQuantity(0.25, 'tsp', 'us')).toBe('¼ tsp');
    expect(formatQuantity(120, 'ml', 'us')).toBe('½ cup');
  });
  it('keeps counts', () => {
    expect(formatQuantity(2, null, 'metric')).toBe('2');
    expect(formatQuantity(0.5, 'clove', 'us' as const) ).toBe('½ clove');
    expect(toFraction(1 / 3)).toBe('⅓');
  });
  it('scales', () => {
    expect(scaleQuantity(200, 4, 6)).toBe(300);
    expect(scaleQuantity(200, 0, 6)).toBe(200);
  });
});
