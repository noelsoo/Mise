-- Seed USDA SR Legacy (SR28) foods and portion weights.
-- The data lives in supabase/seed/*.tsv (built by scripts/build-food-seed.py)
-- and is pulled from this public repo at a pinned commit, so the migration
-- stays small and every environment gets identical data.
-- Public domain data: U.S. Department of Agriculture, Agricultural Research Service.

create extension if not exists http with schema extensions;

do $$
declare
  base text := 'https://raw.githubusercontent.com/noelsoo/Mise/3aca7587b585ad9219746b71859fc3861e2865d1/supabase/seed/';
  foods_body text;
  portions_body text;
begin
  select content into foods_body from extensions.http_get(base || 'foods.tsv') where status = 200;
  select content into portions_body from extensions.http_get(base || 'food_portions.tsv') where status = 200;
  if foods_body is null or portions_body is null then
    raise exception 'Could not download the food seed from %', base;
  end if;

  insert into public.foods (id, name, food_group, kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, sat_fat_g, sodium_mg)
  select f[1]::int, f[2], f[3],
    nullif(f[4], '')::numeric, nullif(f[5], '')::numeric, nullif(f[6], '')::numeric, nullif(f[7], '')::numeric,
    nullif(f[8], '')::numeric, nullif(f[9], '')::numeric, nullif(f[10], '')::numeric, nullif(f[11], '')::numeric
  from (
    select string_to_array(line, E'\t') as f
    from string_to_table(foods_body, E'\n') with ordinality as t(line, n)
    where n > 1 and line <> ''
  ) rows
  on conflict (id) do update set name = excluded.name, food_group = excluded.food_group,
    kcal = excluded.kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g,
    fibre_g = excluded.fibre_g, sugar_g = excluded.sugar_g, sat_fat_g = excluded.sat_fat_g, sodium_mg = excluded.sodium_mg;

  delete from public.food_portions;
  insert into public.food_portions (food_id, amount, unit, grams)
  select f[1]::int, f[2]::numeric, f[3], f[4]::numeric
  from (
    select string_to_array(line, E'\t') as f
    from string_to_table(portions_body, E'\n') with ordinality as t(line, n)
    where n > 1 and line <> ''
  ) rows;
end;
$$;
