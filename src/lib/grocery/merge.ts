import { normaliseUnit, isMass, isVolume, toGramsDirect, toMl, formatQuantity, toFraction, type CanonicalUnit } from '../units';

export type PlannedLine = {
  name: string;
  ingredientKey: string;
  quantity: number | null;
  unit: string | null;
  recipeTitle: string;
  servingsFactor: number;
  aisleHint?: string | null;
};
export type GroceryItem = { mergeKey: string; name: string; quantityText: string; aisle: Aisle; isStaple: boolean; sources: string[] };

export const AISLES = ['Produce', 'Meat & seafood', 'Dairy & eggs', 'Bakery', 'Pantry', 'Spices & condiments', 'Frozen', 'Drinks', 'Other'] as const;
export type Aisle = (typeof AISLES)[number];

const GROUP_AISLE: Record<string, Aisle> = {
  'Vegetables and Vegetable Products': 'Produce', 'Fruits and Fruit Juices': 'Produce',
  'Poultry Products': 'Meat & seafood', 'Beef Products': 'Meat & seafood', 'Pork Products': 'Meat & seafood',
  'Lamb, Veal, and Game Products': 'Meat & seafood', 'Finfish and Shellfish Products': 'Meat & seafood',
  'Sausages and Luncheon Meats': 'Meat & seafood',
  'Dairy and Egg Products': 'Dairy & eggs', 'Baked Products': 'Bakery',
  'Spices and Herbs': 'Spices & condiments', 'Soups, Sauces, and Gravies': 'Spices & condiments',
  'Fats and Oils': 'Pantry', 'Cereal Grains and Pasta': 'Pantry', 'Legumes and Legume Products': 'Pantry',
  'Nut and Seed Products': 'Pantry', 'Sweets': 'Pantry', 'Beverages': 'Drinks',
};

const KEYWORDS: [RegExp, Aisle][] = [
  [/\b(frozen|ice cream)\b/, 'Frozen'],
  [/\b(chicken|beef|pork|lamb|mince|bacon|sausage|ham|turkey|duck|steak|salmon|tuna|cod|prawn|shrimp|fish|squid|crab)\b/, 'Meat & seafood'],
  [/\b(milk|cheese|butter|cream|yogh?urt|egg|paneer|mozzarella|parmesan|cheddar|ghee)\b/, 'Dairy & eggs'],
  [/\b(bread|bun|roll|tortilla|pita|naan|baguette|croissant|wrap)\b/, 'Bakery'],
  [/\b(salt|pepper|cumin|paprika|turmeric|oregano|thyme|cinnamon|chilli powder|curry|masala|sauce|vinegar|mustard|ketchup|mayo|mayonnaise|stock|paste|spice)\b/, 'Spices & condiments'],
  [/\b(wine|beer|juice|coffee|tea|soda|cola|water)\b/, 'Drinks'],
  [/\b(onion|garlic|ginger|tomato|potato|carrot|lettuce|spinach|cabbage|broccoli|pepper|chilli|cucumber|mushroom|celery|leek|coriander|basil|parsley|mint|lemon|lime|apple|banana|orange|avocado|scallion|spring onion|kale|pumpkin|corn|bean sprout|herb)\b/, 'Produce'],
  [/\b(flour|sugar|rice|pasta|noodle|oil|oats?|lentil|chickpea|beans?|nut|almond|honey|syrup|cocoa|chocolate|tin|can|couscous|quinoa)\b/, 'Pantry'],
];

export function aisleFor(name: string, foodGroup?: string | null): Aisle {
  if (foodGroup && GROUP_AISLE[foodGroup]) {
    const g = GROUP_AISLE[foodGroup];
    if (g !== 'Spices & condiments' || !/\b(stock|broth)\b/.test(name)) return g;
  }
  const n = name.toLowerCase();
  for (const [re, a] of KEYWORDS) if (re.test(n)) return a;
  return 'Other';
}

const STAPLES = /^(salt|sea salt|pepper|black pepper|white pepper|water|sugar|flour|plain flour|soy sauce|[a-z ]*\boil|butter|baking powder|bicarbonate of soda|baking soda|stock cube|vinegar)$/;
export function isStaple(key: string): boolean {
  return STAPLES.test(key.toLowerCase().trim());
}

type Acc = { mass: number; vols: Map<CanonicalUnit, number>; counts: Map<string, number>; unknown: boolean; display: string; sources: Set<string>; hint?: string | null };

export function buildGroceryList(lines: PlannedLine[], opts: { system?: 'metric' | 'us' } = {}): GroceryItem[] {
  const system = opts.system ?? 'metric';
  const map = new Map<string, Acc>();
  for (const l of lines) {
    const key = l.ingredientKey || l.name.toLowerCase();
    const a = map.get(key) ?? { mass: 0, vols: new Map(), counts: new Map(), unknown: false, display: l.name, sources: new Set(), hint: l.aisleHint };
    map.set(key, a);
    a.sources.add(l.recipeTitle);
    a.hint ??= l.aisleHint;
    if (l.quantity == null) { a.unknown = true; continue; }
    const q = l.quantity * l.servingsFactor;
    const u = normaliseUnit(l.unit);
    if (isMass(u)) a.mass += toGramsDirect(q, u)!;
    else if (isVolume(u)) a.vols.set(u, (a.vols.get(u) ?? 0) + q);
    else {
      const c = u ?? (l.unit ? l.unit.toLowerCase() : '');
      a.counts.set(c, (a.counts.get(c) ?? 0) + q);
    }
  }
  return [...map].map(([mergeKey, a]) => {
    const parts: string[] = [];
    if (a.mass) parts.push(formatQuantity(a.mass, 'g', system));
    if (a.vols.size === 1) {
      const [[u, q]] = [...a.vols];
      parts.push(`${toFraction(q)} ${u}`);
    } else if (a.vols.size > 1) {
      parts.push(formatQuantity([...a.vols].reduce((t, [u, q]) => t + toMl(q, u)!, 0), 'ml', system));
    }
    for (const [c, q] of a.counts) parts.push(formatQuantity(q, c || null, system));
    if (a.unknown && !parts.length) parts.push('');
    return {
      mergeKey, name: a.display, quantityText: parts.join(' + '),
      aisle: aisleFor(a.display, a.hint), isStaple: isStaple(mergeKey), sources: [...a.sources],
    };
  });
}

export type ExistingItem = { id: string; mergeKey: string; isManual: boolean; checked: boolean; name?: string; quantityText?: string; aisle?: string; isStaple?: boolean; sources?: string[] };

export function regenerate<E extends ExistingItem>(existing: E[], fresh: GroceryItem[]) {
  const auto = new Map(existing.filter((e) => !e.isManual).map((e) => [e.mergeKey, e]));
  const freshKeys = new Set(fresh.map((f) => f.mergeKey));
  const toInsert: GroceryItem[] = [];
  const toUpdate: (GroceryItem & { id: string; checked: boolean })[] = [];
  for (const f of fresh) {
    const e = auto.get(f.mergeKey);
    if (e) toUpdate.push({ ...f, id: e.id, checked: e.checked });
    else toInsert.push(f);
  }
  const toDelete = existing.filter((e) => !e.isManual && !freshKeys.has(e.mergeKey)).map((e) => e.id);
  return { toInsert, toDelete, toUpdate };
}

export function toShareText(items: { name: string; quantityText: string; aisle: string; isStaple: boolean; checked?: boolean }[]): string {
  const open = items.filter((i) => !i.checked);
  const fmt = (i: { name: string; quantityText: string }) => `- ${i.name}${i.quantityText ? ` (${i.quantityText})` : ''}`;
  const out: string[] = [];
  for (const aisle of AISLES) {
    const rows = open.filter((i) => !i.isStaple && i.aisle === aisle);
    if (rows.length) out.push(aisle, ...rows.map(fmt), '');
  }
  const staples = open.filter((i) => i.isStaple);
  if (staples.length) out.push('Probably have', ...staples.map(fmt), '');
  return out.join('\n').trim();
}
