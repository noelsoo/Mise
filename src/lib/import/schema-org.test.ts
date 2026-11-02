import { describe, it, expect } from 'vitest';
import { extractRecipeFromHtml } from './schema-org';
import { recipeDraftSchema } from './types';

const page = (json: unknown) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head><body></body></html>`;

describe('extractRecipeFromHtml', () => {
  it('maps a full JSON-LD recipe inside @graph', () => {
    const html = page({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: 'x' },
        {
          '@type': ['Recipe', 'Thing'],
          name: 'Tom &amp; Jerry&#39;s   Stew',
          description: '<p>A <b>great</b> stew &amp; more</p>',
          recipeYield: ['4', '4 servings'],
          prepTime: 'PT15M',
          cookTime: 'PT1H30M',
          recipeCuisine: 'British',
          recipeCategory: ['Dinner', 'Main'],
          keywords: 'stew, beef, Stew, winter',
          recipeIngredient: ['500g beef', '  1  onion '],
          recipeInstructions: [
            { '@type': 'HowToSection', name: 'Prep', itemListElement: [{ '@type': 'HowToStep', text: 'Chop.' }] },
            { '@type': 'HowToStep', text: 'Simmer &amp; serve.' },
          ],
          image: [{ '@type': 'ImageObject', url: '/img/a.jpg' }, 'https://cdn.example.com/b.jpg'],
        },
      ],
    });
    const d = extractRecipeFromHtml(html, 'https://example.com/recipes/stew')!;
    expect(d.title).toBe("Tom & Jerry's Stew");
    expect(d.description).toBe('A great stew & more');
    expect(d.servings).toBe(4);
    expect(d.prepMinutes).toBe(15);
    expect(d.cookMinutes).toBe(90);
    expect(d.cuisine).toBe('British');
    expect(d.course).toBe('Dinner, Main');
    expect(d.tags).toEqual(['stew', 'beef', 'winter']);
    expect(d.ingredients).toEqual([{ group: null, raw: '500g beef' }, { group: null, raw: '1 onion' }]);
    expect(d.steps).toEqual([
      { group: 'Prep', text: 'Chop.' },
      { group: null, text: 'Simmer & serve.' },
    ]);
    expect(d.imageUrls).toEqual(['https://example.com/img/a.jpg', 'https://cdn.example.com/b.jpg']);
    expect(d.sourceUrl).toBe('https://example.com/recipes/stew');
    expect(recipeDraftSchema.safeParse(d).success).toBe(true);
  });

  it('handles top-level arrays, string instructions and totalTime only', () => {
    const html = page([
      { '@type': 'Recipe', name: 'Toast', recipeYield: 2, totalTime: 'PT10M', recipeInstructions: 'Toast bread.\nButter it.', image: 'https://x.com/t.png', keywords: ['a', 'b'] },
    ]);
    const d = extractRecipeFromHtml(html, 'https://x.com/')!;
    expect(d.servings).toBe(2);
    expect(d.prepMinutes).toBeNull();
    expect(d.cookMinutes).toBe(10);
    expect(d.steps.map((s) => s.text)).toEqual(['Toast bread.', 'Butter it.']);
    expect(d.tags).toEqual(['a', 'b']);
  });

  it('caps tags at 15', () => {
    const kw = Array.from({ length: 30 }, (_, i) => `t${i}`).join(',');
    const d = extractRecipeFromHtml(page({ '@type': 'Recipe', name: 'X', keywords: kw }), 'https://x.com/')!;
    expect(d.tags).toHaveLength(15);
  });

  it('falls back to microdata', () => {
    const html = `<div itemscope itemtype="https://schema.org/Recipe">
      <h1 itemprop="name">Pancakes</h1>
      <meta itemprop="prepTime" content="PT5M">
      <span itemprop="recipeYield">6 pancakes</span>
      <li itemprop="recipeIngredient">1 cup flour</li>
      <li itemprop="recipeIngredient">1 egg</li>
      <div itemprop="recipeInstructions"><ol><li>Mix.</li><li>Fry.</li></ol></div>
      <img itemprop="image" src="/p.jpg"></div>`;
    const d = extractRecipeFromHtml(html, 'https://food.test/p')!;
    expect(d.title).toBe('Pancakes');
    expect(d.prepMinutes).toBe(5);
    expect(d.servings).toBe(6);
    expect(d.ingredients).toHaveLength(2);
    expect(d.steps.map((s) => s.text)).toEqual(['Mix.', 'Fry.']);
    expect(d.imageUrls).toEqual(['https://food.test/p.jpg']);
  });

  it('returns null when no recipe, and survives malformed JSON', () => {
    expect(extractRecipeFromHtml('<html><body>hi</body></html>', 'https://x.com')).toBeNull();
    expect(
      extractRecipeFromHtml('<script type="application/ld+json">{bad</script>', 'https://x.com'),
    ).toBeNull();
  });
});
