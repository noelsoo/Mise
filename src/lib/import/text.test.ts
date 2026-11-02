import { describe, it, expect } from 'vitest';
import { parseRecipeText } from './text';

describe('parseRecipeText', () => {
  it('parses headed text with groups, meta and notes', () => {
    const d = parseRecipeText(`Lemon Drizzle Cake
Serves 8
Prep: 15 min
Cook time 1 hr 20 mins

Ingredients
For the cake:
- 200g butter
• 200g caster sugar
* 4 eggs
For the syrup:
Juice of 2 lemons

Method
1. Heat the oven to 180C.
2) Beat butter and sugar until pale.
Step 3 Bake for 40 minutes.

Notes:
Keeps for 3 days.`);
    expect(d.title).toBe('Lemon Drizzle Cake');
    expect(d.servings).toBe(8);
    expect(d.prepMinutes).toBe(15);
    expect(d.cookMinutes).toBe(80);
    expect(d.ingredients).toEqual([
      { group: 'For the cake', raw: '200g butter' },
      { group: 'For the cake', raw: '200g caster sugar' },
      { group: 'For the cake', raw: '4 eggs' },
      { group: 'For the syrup', raw: 'Juice of 2 lemons' },
    ]);
    expect(d.steps.map((s) => s.text)).toEqual([
      'Heat the oven to 180C.',
      'Beat butter and sugar until pale.',
      'Bake for 40 minutes.',
    ]);
    expect(d.notes).toBe('Keeps for 3 days.');
  });

  it('guesses sections without headings', () => {
    const d = parseRecipeText(`Quick Omelette
Makes 1
2 eggs
½ tsp salt
- knob of butter
Whisk the eggs with the salt until well combined and frothy.
2. Melt the butter and pour in the eggs.`);
    expect(d.servings).toBe(1);
    expect(d.ingredients.map((i) => i.raw)).toEqual(['2 eggs', '½ tsp salt', 'knob of butter']);
    expect(d.steps).toHaveLength(2);
    expect(d.steps[1].text).toBe('Melt the butter and pour in the eggs.');
  });

  it('tolerates OCR noise and hyphenated breaks', () => {
    const d = parseRecipeText(`  Tomato   Soup  \n\nINGREDIENTS:\n1   tin  toma-\ntoes\n\nDIRECTIONS\nSim-\nmer   gently  for 20   minutes.`);
    expect(d.title).toBe('Tomato Soup');
    expect(d.ingredients[0].raw).toBe('1 tin tomatoes');
    expect(d.steps[0].text).toBe('Simmer gently for 20 minutes.');
  });

  it('handles empty input and "4 servings"', () => {
    expect(parseRecipeText('').title).toBe('Untitled recipe');
    expect(parseRecipeText('Soup\n4 servings\nIngredients\n1 onion').servings).toBe(4);
  });
});
