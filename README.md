# Mise

A recipe app that saves recipes, works out calories and macros per serving, plans the week and builds one grocery list. Next.js 16, Supabase (Postgres, Auth, Storage) and Vercel, all on free tiers.

## Run it

```bash
npm ci
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (Vitest), `npm run e2e` (Playwright; the full journey needs `E2E_EMAIL` and `E2E_PASSWORD`).

## Database

All schema lives in `supabase/migrations`. Every table has row level security, and `supabase/tests/rls.sql` checks that one user can't read or change another's data (it rolls back, so it is safe to run anywhere).

Food data is USDA SR Legacy (public domain): 8,789 foods with eight nutrients per 100 g and 15,438 portion weights, built by `scripts/build-food-seed.py` into `supabase/seed/*.tsv` (1.4 MB). The seed migration pulls those files from this repo at a pinned commit. Local names such as kangkong, kailan and belacan-free basics are mapped in `food_aliases`.

## How nutrition is counted

Each ingredient line is parsed into quantity, unit and food, then matched in this order: the user's saved fix, their custom foods, local aliases, then a fuzzy search. Grams come from USDA portion weights. If there is no known weight the line is left uncounted rather than guessed, and totals are labelled "at least".

## Keeping the free project awake

`.github/workflows/keepalive.yml` calls `/api/health` daily, because free Supabase projects pause after 7 days without activity.
