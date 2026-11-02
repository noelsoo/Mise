import type { RecipeDraft } from './types';

type Section = 'ingredients' | 'steps' | 'notes' | null;

const HEADING = /^(ingredients?|method|directions?|instructions?|steps?|preparation|notes?|tips?)\s*:?$/i;
const BULLET = /^\s*(?:[-•‣◦⁃*·–]|—)\s+/;
const STEP_NUM = /^\s*(?:step\s*\d+\s*[:.)-]?|\d+\s*[.)])\s*/i;
const QUANTITY = /^(?:[\d¼½¾⅓⅔⅛]|(?:a\s+)?(?:pinch|dash|handful|knob|splash|few|some)\b)/i;
const SERVINGS = /^(?:serves|makes|yields?|servings?)\s*:?\s*(\d+)|^(\d+)\s*servings?\b/i;
const TIME_GLOBAL = /\b(prep|preparation|cook|cooking)(?:\s*time)?\s*[:\-]?\s*((?:\d+(?:\.\d+)?\s*(?:hours?|hrs?|h|minutes?|mins?|m)\b\.?\s*(?:and\s+)?)+)/gi;

function durationToMinutes(s: string): number {
  let total = 0;
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi)) {
    const n = parseFloat(m[1]);
    total += m[2].toLowerCase().startsWith('h') ? n * 60 : n;
  }
  return Math.round(total);
}

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/([a-z])-[ \t]*\n[ \t]*([a-z])/g, '$1$2')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

export function parseRecipeText(text: string): RecipeDraft {
  const lines = normalise(text).split('\n').filter((l) => l !== '');
  const draft: RecipeDraft = {
    title: '',
    description: null,
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    cuisine: null,
    course: null,
    tags: [],
    ingredients: [],
    steps: [],
    notes: null,
    sourceUrl: null,
    imageUrls: [],
  };
  if (lines.length === 0) {
    draft.title = 'Untitled recipe';
    return draft;
  }
  draft.title = lines[0].replace(BULLET, '').replace(/^#+\s*/, '').slice(0, 200) || 'Untitled recipe';
  const body = lines.slice(1);
  const hasHeadings = body.some((l) => HEADING.test(l.replace(/^#+\s*/, '')));

  let section: Section = null;
  let group: string | null = null;
  const notes: string[] = [];
  const desc: string[] = [];

  for (const line of body) {
    const h = line.replace(/^#+\s*/, '').match(HEADING);
    if (h) {
      const w = h[1].toLowerCase();
      section = w.startsWith('ingredient') ? 'ingredients' : /^(notes?|tips?)$/.test(w) ? 'notes' : 'steps';
      group = null;
      continue;
    }

    // Metadata lines (servings, times)
    const unbulleted = line.replace(BULLET, '');
    const sv = unbulleted.match(SERVINGS);
    if (sv && unbulleted.length < 40 && draft.servings === null) {
      draft.servings = parseInt(sv[1] ?? sv[2], 10);
      continue;
    }
    if (unbulleted.length < 100) {
      const times = [...unbulleted.matchAll(TIME_GLOBAL)];
      if (times.length > 0) {
        for (const t of times) {
          const mins = durationToMinutes(t[2]);
          if (mins <= 0) continue;
          if (t[1].toLowerCase().startsWith('prep')) draft.prepMinutes = mins;
          else draft.cookMinutes = mins;
        }
        continue;
      }
    }

    if (section === 'notes') {
      notes.push(unbulleted);
      continue;
    }

    const isGroupLabel = /^[^.!?]{1,60}:$/.test(unbulleted);
    const stepNum = STEP_NUM.test(line);

    if (isGroupLabel && section !== null) {
      group = unbulleted.slice(0, -1).trim();
      continue;
    }

    if (section === 'ingredients') {
      draft.ingredients.push({ group, raw: unbulleted });
    } else if (section === 'steps') {
      draft.steps.push({ group, text: line.replace(BULLET, '').replace(STEP_NUM, '').trim() });
    } else {
      // No section yet: guess.
      if (isGroupLabel && !stepNum) {
        group = unbulleted.slice(0, -1).trim();
        continue;
      }
      const looksIngredient =
        !stepNum && line.length <= 80 && (BULLET.test(line) || QUANTITY.test(unbulleted)) && !/[.!?]$/.test(unbulleted);
      if (looksIngredient) {
        draft.ingredients.push({ group, raw: unbulleted });
      } else if (stepNum || draft.ingredients.length > 0 || !hasHeadings) {
        draft.steps.push({ group: null, text: line.replace(BULLET, '').replace(STEP_NUM, '').trim() });
      } else {
        desc.push(unbulleted);
      }
    }
  }

  draft.ingredients = draft.ingredients.filter((i) => i.raw);
  draft.steps = draft.steps.filter((s) => s.text);
  draft.description = desc.join(' ').slice(0, 4000) || null;
  draft.notes = notes.join('\n').slice(0, 4000) || null;
  return draft;
}
