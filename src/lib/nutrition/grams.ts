import { normaliseUnit, isMass, isVolume, toGramsDirect, toMl } from '../units';

export type Portion = { amount: number; unit: string; grams: number };
export type GramsResult = { grams: number | null; reason?: string };

const COUNT_WORDS = ['medium', 'large', 'small', 'clove', 'slice', 'each', 'piece', 'whole', 'item', 'unit', 'head', 'bunch', 'sprig', 'stalk', 'fillet', 'can', 'breast', 'thigh'];
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Canonical volume unit of a portion label ("cup, chopped", "cup (8 fl oz)"), or null. */
function portionVolumeUnit(label: string) {
  const l = norm(label);
  const head = l.split(/[,(]/)[0].trim();
  const u = normaliseUnit(head);
  return isVolume(u) ? u : null;
}

function perMl(p: Portion): number | null {
  const u = portionVolumeUnit(p.unit);
  const ml = u && p.amount > 0 ? toMl(p.amount, u) : null;
  return ml ? p.grams / ml : null;
}

export function toGrams(
  line: { quantity: number | null; unit: string | null; name: string },
  portions: Portion[],
): GramsResult {
  const { quantity } = line;
  if (quantity == null) return { grams: null, reason: 'no quantity' };
  const unit = normaliseUnit(line.unit);

  if (isMass(unit)) return { grams: toGramsDirect(quantity, unit) };

  if (isVolume(unit)) {
    const vols = portions.filter((p) => portionVolumeUnit(p.unit) && p.amount > 0);
    // Prefer an exact-unit portion, plain label before qualified ones.
    const exact = vols
      .filter((p) => portionVolumeUnit(p.unit) === unit)
      .sort((a, b) => Number(/[,(]/.test(a.unit)) - Number(/[,(]/.test(b.unit)));
    if (exact[0]) return { grams: (quantity * exact[0].grams) / exact[0].amount };
    const other = vols.sort((a, b) => Number(/[,(]/.test(a.unit)) - Number(/[,(]/.test(b.unit)))[0];
    const density = other ? perMl(other) : null;
    if (density) return { grams: quantity * (toMl(1, unit) as number) * density };
    return { grams: null, reason: `no portion for ${unit}` };
  }

  // Count items: unit is null or a count word like "cloves", "large", "slices".
  const word = line.unit ? norm(line.unit).replace(/s$/, '') : null;
  const candidates = portions.filter((p) => p.amount > 0 && !portionVolumeUnit(p.unit) && !isMass(normaliseUnit(p.unit)));
  const matches = (p: Portion, w: string) => norm(p.unit).split(/[\s,()]+/).includes(w);
  let hit: Portion | undefined;
  if (word) hit = candidates.find((p) => matches(p, word));
  // A named unit we have no weight for ("1 bunch", "1 packet") stays uncounted: never guess.
  // Size words ("large", "medium", "small", "whole") can still fall back to a generic count portion.
  if (!hit && word && !['large', 'medium', 'small', 'whole', 'piece', 'each', 'item'].includes(word)) {
    return { grams: null, reason: `no portion for ${line.unit}` };
  }
  if (!hit) {
    const generic = candidates.filter((p) => COUNT_WORDS.some((w) => matches(p, w)));
    hit =
      (word && ['large', 'small'].includes(word) ? generic.find((p) => matches(p, word)) : undefined) ??
      generic.find((p) => matches(p, 'medium')) ??
      generic[0];
  }
  if (!hit) return { grams: null, reason: 'no count portion' };
  return { grams: (quantity * hit.grams) / hit.amount };
}
