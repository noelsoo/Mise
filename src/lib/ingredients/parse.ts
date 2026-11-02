import { parseIngredient } from 'parse-ingredient';
import { normaliseUnit } from '../units';

export type ParsedIngredient = {
  raw: string;
  quantity: number | null;
  quantity2: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  isGroupHeader: boolean;
};

const DESCRIPTORS = new Set([
  'fresh', 'freshly', 'chopped', 'finely', 'roughly', 'coarsely', 'diced', 'sliced', 'minced', 'grated', 'crushed',
  'peeled', 'large', 'medium', 'small', 'ripe', 'frozen', 'dried', 'ground', 'optional', 'thinly', 'thickly', 'extra',
  'whole', 'boneless', 'skinless', 'cooked', 'raw', 'packed', 'heaped', 'level', 'good', 'quality', 'of', 'a', 'the',
]);

/** Normalised matching key: lowercase, no punctuation, no descriptors, naive singular. */
export function ingredientKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/,.*$/, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !DESCRIPTORS.has(w));
  if (!words.length) return name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const last = words.length - 1;
  words[last] = singular(words[last]);
  return words.join(' ');
}

function singular(w: string): string {
  if (/(ss|us|ies)$/.test(w) && !w.endsWith('ies')) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (/(oes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  return w;
}

function splitNote(desc: string): { name: string; note: string | null } {
  const notes: string[] = [];
  let name = desc.replace(/\(([^)]*)\)/g, (_, n: string) => (notes.push(n.trim()), ' '));
  const i = name.indexOf(',');
  if (i >= 0) {
    notes.push(name.slice(i + 1).trim());
    name = name.slice(0, i);
  }
  name = name.replace(/\s+/g, ' ').trim();
  const note = notes.filter(Boolean).join(', ');
  return { name, note: note || null };
}

const MULTI = /^(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lb)\b\.?\s*(?:cans?|tins?|packs?|packets?|jars?|bottles?)?\s*(?:of\s+)?(.*)$/i;

export function parseIngredientLine(raw: string): ParsedIngredient {
  const text = raw.trim();
  const base: ParsedIngredient = { raw, quantity: null, quantity2: null, unit: null, name: text, note: null, isGroupHeader: false };
  if (!text) return base;

  const m = MULTI.exec(text);
  if (m) {
    const { name, note } = splitNote(m[4]);
    const unit = normaliseUnit(m[3]) ?? m[3];
    const pack = `${m[1]} x ${m[2]}${m[3]}`;
    return { ...base, quantity: Number(m[1]) * Number(m[2]), unit, name, note: note ? `${pack}, ${note}` : pack };
  }

  const [p] = parseIngredient(text);
  if (!p) return base;
  if (p.isGroupHeader) {
    return { ...base, name: text.replace(/:\s*$/, '').trim(), isGroupHeader: true };
  }
  const { name, note } = splitNote(p.description);
  const unit = p.unitOfMeasure ? normaliseUnit(p.unitOfMeasure) ?? p.unitOfMeasure : null;
  return { ...base, quantity: p.quantity, quantity2: p.quantity2, unit, name: name || p.description, note };
}

export function parseIngredientBlock(text: string): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseIngredientLine);
}
