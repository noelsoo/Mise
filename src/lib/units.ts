export type MassUnit = 'g' | 'kg' | 'mg' | 'oz' | 'lb';
export type VolumeUnit = 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'fl oz' | 'pint' | 'quart';
export type CanonicalUnit = MassUnit | VolumeUnit;

const MASS_G: Record<MassUnit, number> = { g: 1, kg: 1000, mg: 0.001, oz: 28.3495, lb: 453.592 };
const VOLUME_ML: Record<VolumeUnit, number> = {
  ml: 1, l: 1000, tsp: 4.929, tbsp: 14.787, cup: 236.588, 'fl oz': 29.574, pint: 473.176, quart: 946.353,
};

const ALIASES: Record<CanonicalUnit, string[]> = {
  g: ['g', 'gram', 'grams', 'gm', 'gms', 'gr'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
  mg: ['mg', 'milligram', 'milligrams'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  ml: ['ml', 'mls', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  l: ['l', 'litre', 'litres', 'liter', 'liters'],
  tsp: ['tsp', 'tsps', 'teaspoon', 'teaspoons', 't'],
  tbsp: ['tbsp', 'tbsps', 'tbs', 'tablespoon', 'tablespoons', 'T'],
  cup: ['cup', 'cups', 'c'],
  'fl oz': ['fl oz', 'fl. oz', 'fl. oz.', 'floz', 'fluid ounce', 'fluid ounces'],
  pint: ['pint', 'pints', 'pt'],
  quart: ['quart', 'quarts', 'qt'],
};

const CASE_SENSITIVE = new Map<string, CanonicalUnit>([['T', 'tbsp'], ['t', 'tsp']]);
const LOOKUP = new Map<string, CanonicalUnit>();
for (const [canon, list] of Object.entries(ALIASES) as [CanonicalUnit, string[]][])
  for (const a of list) if (a.length > 1 || a === 'g' || a === 'l' || a === 'c') LOOKUP.set(a.toLowerCase(), canon);

export function normaliseUnit(u: string | null): CanonicalUnit | null {
  if (!u) return null;
  const t = u.trim();
  const exact = CASE_SENSITIVE.get(t);
  if (exact) return exact;
  return LOOKUP.get(t.toLowerCase().replace(/\s+/g, ' ')) ?? null;
}

export const isMass = (u: string | null): u is MassUnit => !!u && u in MASS_G;
export const isVolume = (u: string | null): u is VolumeUnit => !!u && u in VOLUME_ML;

export function toGramsDirect(qty: number, unit: string | null): number | null {
  return isMass(unit) ? qty * MASS_G[unit] : null;
}

export function toMl(qty: number, unit: string | null): number | null {
  return isVolume(unit) ? qty * VOLUME_ML[unit] : null;
}

export function scaleQuantity(qty: number, fromServings: number, toServings: number): number {
  if (!(fromServings > 0) || !(toServings > 0)) return qty;
  return (qty * toServings) / fromServings;
}

const FRACS: [number, string][] = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'],
];

/** Mixed number with unicode fractions, e.g. 1.5 -> "1½". */
export function toFraction(n: number): string {
  if (n <= 0) return '0';
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.06) return String(whole || 0);
  if (frac > 0.94) return String(whole + 1);
  let best = FRACS[0];
  for (const f of FRACS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  if (Math.abs(best[0] - frac) > 0.04) return String(Math.round(n * 10) / 10);
  return (whole ? String(whole) : '') + best[1];
}

function niceMetric(n: number): string {
  const step = n >= 100 ? 5 : n >= 10 ? 1 : 0.5;
  const r = n >= 1000 ? Math.round(n) : Math.round(n / step) * step;
  return String(Math.round(r * 100) / 100);
}

const round2 = (n: number) => String(Math.round(n * 100) / 100);

export function formatQuantity(qty: number, unit: CanonicalUnit | (string & {}) | null, system: 'metric' | 'us'): string {
  if (isMass(unit)) {
    if (system === 'metric') {
      const g = qty * MASS_G[unit];
      return g >= 1000 ? `${round2(g / 1000)} kg` : `${niceMetric(g)} g`;
    }
    const oz = (qty * MASS_G[unit]) / MASS_G.oz;
    return oz >= 16 ? `${round2(oz / 16)} lb` : `${round2(oz)} oz`;
  }
  if (isVolume(unit)) {
    if (system === 'metric') {
      const ml = qty * VOLUME_ML[unit];
      return ml >= 1000 ? `${round2(ml / 1000)} l` : `${niceMetric(ml)} ml`;
    }
    const ml = qty * VOLUME_ML[unit];
    if (ml >= VOLUME_ML.cup / 4 - 1) return `${toFraction(ml / VOLUME_ML.cup)} cup`;
    if (ml >= VOLUME_ML.tbsp - 1) return `${toFraction(ml / VOLUME_ML.tbsp)} tbsp`;
    return `${toFraction(ml / VOLUME_ML.tsp)} tsp`;
  }
  return unit ? `${toFraction(qty)} ${unit}` : toFraction(qty);
}
