import * as cheerio from 'cheerio';
import type { RecipeDraft } from './types';

type Json = unknown;
type Obj = Record<string, Json>;

const isObj = (v: Json): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Strip tags, decode entities, collapse whitespace. */
function clean(v: Json): string {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return '';
  const withBreaks = v.replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, ' ');
  const text = cheerio.load(`<body>${withBreaks}</body>`).root().text();
  return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function asArray(v: Json): Json[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function hasType(node: Obj, type: string): boolean {
  return asArray(node['@type']).some((t) => typeof t === 'string' && t.split('/').pop() === type);
}

function collectNodes(data: Json, out: Obj[]): void {
  if (Array.isArray(data)) {
    data.forEach((d) => collectNodes(d, out));
  } else if (isObj(data)) {
    out.push(data);
    if (data['@graph']) collectNodes(data['@graph'], out);
  }
}

export function parseDuration(v: Json): number | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return null;
  const [d, h, mi, s] = [m[1], m[2], m[3], m[4]].map((x) => (x ? parseFloat(x) : 0));
  const total = Math.round(d * 1440 + h * 60 + mi + s / 60);
  return total > 0 ? total : null;
}

export function parseServings(v: Json): number | null {
  for (const item of asArray(v)) {
    const m = clean(item).match(/\d+(?:\.\d+)?/);
    if (m) {
      const n = parseFloat(m[0]);
      if (n > 0) return n;
    }
  }
  return null;
}

function strList(v: Json): string[] {
  const out: string[] = [];
  for (const item of asArray(v)) {
    if (typeof item === 'string') {
      const c = clean(item);
      if (c) out.push(c);
    }
  }
  return out;
}

function splitList(v: Json): string[] {
  return strList(v).flatMap((s) => s.split(/[,;]/)).map((s) => s.trim()).filter(Boolean);
}

function dedupe(list: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out.slice(0, max);
}

function parseSteps(v: Json, group: string | null, out: RecipeDraft['steps']): void {
  if (typeof v === 'string') {
    const parts = /<\s*(br|li|p)\b/i.test(v)
      ? v.split(/<\s*br\s*\/?>|<\/?\s*(?:li|p)\s*>/i)
      : v.split(/\r?\n+/);
    for (const p of parts) {
      const text = clean(p);
      if (text) out.push({ group, text });
    }
  } else if (Array.isArray(v)) {
    v.forEach((x) => parseSteps(x, group, out));
  } else if (isObj(v)) {
    if (hasType(v, 'HowToSection') || (v.itemListElement && !v.text)) {
      const name = clean(v.name) || group;
      parseSteps(v.itemListElement, name, out);
    } else {
      const text = clean(v.text ?? v.name);
      if (text) out.push({ group, text });
    }
  }
}

function imageUrls(v: Json, base: string): string[] {
  const urls: string[] = [];
  for (const item of asArray(v)) {
    const raw = typeof item === 'string' ? item : isObj(item) ? (item.url ?? item.contentUrl) : null;
    if (typeof raw !== 'string' || !raw.trim()) continue;
    try {
      const u = new URL(raw.trim(), base);
      if (u.protocol === 'http:' || u.protocol === 'https:') urls.push(u.href);
    } catch {
      /* ignore bad URL */
    }
  }
  return dedupe(urls, 10);
}

function fromNode(node: Obj, pageUrl: string): RecipeDraft | null {
  const title = clean(node.name ?? node.headline);
  if (!title) return null;
  const prep = parseDuration(node.prepTime);
  const cook = parseDuration(node.cookTime);
  const total = parseDuration(node.totalTime);
  const steps: RecipeDraft['steps'] = [];
  parseSteps(node.recipeInstructions, null, steps);
  const cuisine = strList(node.recipeCuisine)[0] ?? null;
  const course = dedupe(splitList(node.recipeCategory), 5).join(', ') || null;
  return {
    title: title.slice(0, 200),
    description: clean(node.description) || null,
    servings: parseServings(node.recipeYield),
    prepMinutes: prep,
    cookMinutes: cook ?? (prep === null ? total : null),
    cuisine,
    course,
    tags: dedupe(splitList(node.keywords), 15),
    ingredients: strList(node.recipeIngredient ?? node.ingredients).map((raw) => ({ group: null, raw })),
    steps,
    notes: null,
    sourceUrl: pageUrl || null,
    imageUrls: imageUrls(node.image, pageUrl),
  };
}

function fromMicrodata($: cheerio.CheerioAPI, pageUrl: string): RecipeDraft | null {
  const root = $('[itemtype*="schema.org/Recipe"]').first();
  if (!root.length) return null;
  const props = (name: string) =>
    root.find(`[itemprop="${name}"]`).toArray().map((el) => $(el));
  const val = (el: cheerio.Cheerio<never>) =>
    el.attr('content') ?? el.attr('datetime') ?? el.attr('src') ?? el.attr('href') ?? el.text();
  const first = (name: string) => {
    const p = props(name)[0];
    return p ? val(p as never) : undefined;
  };
  const instructions: Json[] = props('recipeInstructions').flatMap((el) => {
    const lis = el.find('li').toArray();
    if (lis.length) return lis.map((li) => $(li).text());
    const sub = el.find('[itemprop="text"]').toArray();
    return sub.length ? sub.map((s) => $(s).text()) : [el.text()];
  });
  return fromNode(
    {
      name: first('name'),
      description: first('description'),
      recipeYield: first('recipeYield'),
      prepTime: first('prepTime'),
      cookTime: first('cookTime'),
      totalTime: first('totalTime'),
      recipeCuisine: first('recipeCuisine'),
      recipeCategory: props('recipeCategory').map((p) => val(p as never)),
      keywords: props('keywords').map((p) => val(p as never)),
      recipeIngredient: [...props('recipeIngredient'), ...props('ingredients')].map((p) => val(p as never)),
      recipeInstructions: instructions,
      image: props('image').map((p) => val(p as never)),
    },
    pageUrl,
  );
}

export function extractRecipeFromHtml(html: string, pageUrl: string): RecipeDraft | null {
  const $ = cheerio.load(html);
  const nodes: Obj[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try {
      collectNodes(JSON.parse(raw), nodes);
    } catch {
      /* skip malformed block */
    }
  });
  for (const node of nodes.filter((n) => hasType(n, 'Recipe'))) {
    const draft = fromNode(node, pageUrl);
    if (draft) return draft;
  }
  return fromMicrodata($, pageUrl);
}
