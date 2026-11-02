import { describe, it, expect } from 'vitest';
import { toDraft } from './structure';
import { transcriptText } from './transcript';

const good = { is_recipe: true, title: 'Garlic noodles', servings: 2, ingredients: ['200 g noodles', '3 cloves garlic'], steps: ['Boil the noodles.'], notes: null };

describe('toDraft', () => {
  it('maps tool output to a draft', () => {
    const d = toDraft(good, 'https://www.tiktok.com/@a/video/1', ['https://x/y.jpg'], ['easy']);
    expect(d?.ingredients).toEqual([{ group: null, raw: '200 g noodles' }, { group: null, raw: '3 cloves garlic' }]);
    expect(d?.sourceUrl).toBe('https://www.tiktok.com/@a/video/1');
    expect(d?.tags).toEqual(['easy']);
  });
  it('rejects non-recipes, empty recipes and malformed output', () => {
    expect(toDraft({ ...good, is_recipe: false }, 'u', [], [])).toBeNull();
    expect(toDraft({ ...good, ingredients: [], steps: [] }, 'u', [], [])).toBeNull();
    expect(toDraft({ title: 5 }, 'u', [], [])).toBeNull();
    expect(toDraft(null, 'u', [], [])).toBeNull();
  });
});

describe('transcriptText', () => {
  it('joins segments, collapses whitespace and caps length', () => {
    expect(transcriptText([{ text: 'add the  garlic' }, { text: 'and stir' }])).toBe('add the garlic and stir');
    expect(transcriptText('x'.repeat(30000))).toHaveLength(20000);
  });
});
