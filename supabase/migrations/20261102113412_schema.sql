-- Mise core schema. Every table in public has RLS on.
-- Policies follow the Supabase agent-skill checklist: TO authenticated plus an
-- ownership predicate, (select auth.uid()) for per-statement caching, and
-- WITH CHECK on every write so rows can't be reassigned to another user.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- updated_at helper
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  units text not null default 'metric' check (units in ('metric', 'us')),
  week_start smallint not null default 1 check (week_start between 0 and 6),
  kcal_target integer check (kcal_target between 500 and 10000),
  protein_target integer check (protein_target between 0 and 1000),
  carbs_target integer check (carbs_target between 0 and 2000),
  fat_target integer check (fat_target between 0 and 1000),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Create a profile row for every new auth user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Reference foods (USDA SR Legacy) ----------------------------------------
create table public.foods (
  id integer primary key,
  name text not null,
  food_group text not null default '',
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fibre_g numeric,
  sugar_g numeric,
  sat_fat_g numeric,
  sodium_mg numeric
);
create index foods_name_trgm on public.foods using gin (lower(name) extensions.gin_trgm_ops);

create table public.food_portions (
  id bigint generated always as identity primary key,
  food_id integer not null references public.foods (id) on delete cascade,
  amount numeric not null,
  unit text not null,
  grams numeric not null
);
create index food_portions_food_id on public.food_portions (food_id);

-- Local names (kangkong -> water spinach, etc). Global, read-only to users.
create table public.food_aliases (
  alias text primary key check (alias = lower(alias)),
  food_id integer not null references public.foods (id) on delete cascade
);
create index food_aliases_food_id on public.food_aliases (food_id);

-- Custom foods from a packet label --------------------------------------
create table public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  serving_g numeric check (serving_g > 0),
  kcal numeric not null check (kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  fibre_g numeric check (fibre_g >= 0),
  sugar_g numeric check (sugar_g >= 0),
  sat_fat_g numeric check (sat_fat_g >= 0),
  sodium_mg numeric check (sodium_mg >= 0),
  created_at timestamptz not null default now()
);
create index custom_foods_user_id on public.custom_foods (user_id);

-- Remembered fixes: "when I write X, I mean food Y"
create table public.food_matches (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ingredient_key text not null check (char_length(ingredient_key) between 1 and 200),
  food_id integer references public.foods (id) on delete cascade,
  custom_food_id uuid references public.custom_foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ingredient_key),
  check ((food_id is null) <> (custom_food_id is null))
);
create index food_matches_food_id on public.food_matches (food_id);
create index food_matches_custom_food_id on public.food_matches (custom_food_id);

-- Recipes ------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  servings numeric not null default 2 check (servings > 0 and servings <= 100),
  prep_minutes integer check (prep_minutes between 0 and 10000),
  cook_minutes integer check (cook_minutes between 0 and 10000),
  cuisine text check (char_length(cuisine) <= 60),
  course text check (char_length(course) <= 60),
  tags text[] not null default '{}' check (cardinality(tags) <= 30),
  notes text check (char_length(notes) <= 10000),
  source_url text check (source_url ~* '^https?://' and char_length(source_url) <= 2000),
  rating smallint check (rating between 1 and 5),
  favourite boolean not null default false,
  photos text[] not null default '{}' check (cardinality(photos) <= 10),
  -- Cached per-serving nutrition, recalculated by the app on every save.
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fibre_g numeric,
  sugar_g numeric,
  sat_fat_g numeric,
  sodium_mg numeric,
  counted_count integer not null default 0,
  ingredient_count integer not null default 0,
  share_slug uuid unique,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_user_id on public.recipes (user_id, updated_at desc);
create index recipes_title_trgm on public.recipes using gin (lower(title) extensions.gin_trgm_ops);

create trigger recipes_touch before update on public.recipes
  for each row execute function private.touch_updated_at();

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  group_name text check (char_length(group_name) <= 80),
  raw text not null check (char_length(raw) between 1 and 300),
  quantity numeric,
  quantity2 numeric,
  unit text check (char_length(unit) <= 40),
  name text not null default '' check (char_length(name) <= 200),
  note text check (char_length(note) <= 200),
  food_id integer references public.foods (id) on delete set null,
  custom_food_id uuid references public.custom_foods (id) on delete set null,
  grams numeric check (grams >= 0),
  match_source text check (match_source in ('fix', 'custom', 'alias', 'search', 'manual')),
  counted boolean not null default false
);
create index ingredients_recipe_id on public.ingredients (recipe_id, position);
create index ingredients_user_id on public.ingredients (user_id);
create index ingredients_food_id on public.ingredients (food_id);
create index ingredients_custom_food_id on public.ingredients (custom_food_id);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  group_name text check (char_length(group_name) <= 80),
  text text not null check (char_length(text) between 1 and 4000)
);
create index steps_recipe_id on public.steps (recipe_id, position);
create index steps_user_id on public.steps (user_id);

-- Cookbooks ---------------------------------------------------------------
create table public.cookbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create index cookbooks_user_id on public.cookbooks (user_id);

create table public.cookbook_recipes (
  cookbook_id uuid not null references public.cookbooks (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  primary key (cookbook_id, recipe_id)
);
create index cookbook_recipes_recipe_id on public.cookbook_recipes (recipe_id);
create index cookbook_recipes_user_id on public.cookbook_recipes (user_id);

-- Meal plan ---------------------------------------------------------------
create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid references public.recipes (id) on delete cascade,
  servings numeric check (servings > 0 and servings <= 100),
  note text check (char_length(note) <= 200),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (recipe_id is not null or note is not null)
);
create index meal_plan_user_date on public.meal_plan_entries (user_id, date);
create index meal_plan_recipe_id on public.meal_plan_entries (recipe_id);

-- Grocery list ------------------------------------------------------------
create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  quantity_text text check (char_length(quantity_text) <= 200),
  aisle text not null default 'Other' check (char_length(aisle) <= 40),
  merge_key text check (char_length(merge_key) <= 200),
  is_manual boolean not null default false,
  is_staple boolean not null default false,
  checked boolean not null default false,
  sources text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index grocery_items_user_id on public.grocery_items (user_id, aisle, position);

-- RLS ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.food_portions enable row level security;
alter table public.food_aliases enable row level security;
alter table public.custom_foods enable row level security;
alter table public.food_matches enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.steps enable row level security;
alter table public.cookbooks enable row level security;
alter table public.cookbook_recipes enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.grocery_items enable row level security;

-- Reference data: signed-in users read, nobody writes through the API.
create policy "foods readable" on public.foods for select to authenticated using (true);
create policy "portions readable" on public.food_portions for select to authenticated using (true);
create policy "aliases readable" on public.food_aliases for select to authenticated using (true);

create policy "own profile select" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- One block of owner-only policies per user table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'custom_foods', 'food_matches', 'recipes', 'ingredients', 'steps',
    'cookbooks', 'cookbook_recipes', 'meal_plan_entries', 'grocery_items'
  ] loop
    execute format('create policy "own %1$s select" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own %1$s insert" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own %1$s update" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own %1$s delete" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Child rows must point at a parent the same user owns (no cross-user links).
create or replace function private.owns_recipe(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.recipes r where r.id = rid and r.user_id = (select auth.uid()));
$$;
revoke execute on function private.owns_recipe(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.owns_recipe(uuid) to authenticated;

create policy "ingredient parent owned" on public.ingredients as restrictive for insert to authenticated
  with check ((select private.owns_recipe(recipe_id)));
create policy "step parent owned" on public.steps as restrictive for insert to authenticated
  with check ((select private.owns_recipe(recipe_id)));
create policy "cookbook recipe owned" on public.cookbook_recipes as restrictive for insert to authenticated
  with check ((select private.owns_recipe(recipe_id))
    and exists (select 1 from public.cookbooks c where c.id = cookbook_id and c.user_id = (select auth.uid())));
create policy "ingredient parent owned on update" on public.ingredients as restrictive for update to authenticated
  using (true) with check ((select private.owns_recipe(recipe_id)));
create policy "step parent owned on update" on public.steps as restrictive for update to authenticated
  using (true) with check ((select private.owns_recipe(recipe_id)));
create policy "cookbook recipe owned on update" on public.cookbook_recipes as restrictive for update to authenticated
  using (true) with check ((select private.owns_recipe(recipe_id)));
create policy "plan recipe owned" on public.meal_plan_entries as restrictive for insert to authenticated
  with check (recipe_id is null or (select private.owns_recipe(recipe_id)));
create policy "plan recipe owned on update" on public.meal_plan_entries as restrictive for update to authenticated
  using (true) with check (recipe_id is null or (select private.owns_recipe(recipe_id)));

-- Grants (new projects may not expose tables to the Data API by default).
grant usage on schema public to anon, authenticated;
grant select on public.foods, public.food_portions, public.food_aliases to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.custom_foods, public.food_matches, public.recipes, public.ingredients, public.steps,
  public.cookbooks, public.cookbook_recipes, public.meal_plan_entries, public.grocery_items
  to authenticated;
revoke all on all tables in schema public from anon;

-- Search ------------------------------------------------------------------
-- Typo-tolerant food search. Runs as the caller, so RLS still applies.
create or replace function public.search_foods(q text, max_results integer default 10)
returns table (id integer, name text, food_group text, kcal numeric, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (select lower(trim(q)) as t)
  select f.id, f.name, f.food_group, f.kcal,
    (extensions.word_similarity(term.t, lower(f.name))
      + case when lower(f.name) like term.t || '%' then 0.3 else 0 end
      + case when lower(f.name) like '%, raw%' then 0.08 else 0 end
      - least(char_length(f.name), 120) / 1200.0)::real as score
  from public.foods f, term
  where char_length(term.t) >= 2
    and term.t operator(extensions.<%) lower(f.name)
  order by score desc
  limit least(greatest(max_results, 1), 50);
$$;

-- Typo-tolerant recipe search over the caller's own recipes.
create or replace function public.search_recipes(q text)
returns setof public.recipes
language sql
stable
security invoker
set search_path = ''
as $$
  select r.*
  from public.recipes r
  where r.user_id = (select auth.uid())
    and (
      lower(r.title) like '%' || lower(trim(q)) || '%'
      or lower(trim(q)) operator(extensions.<%) lower(r.title)
      or exists (select 1 from unnest(r.tags) tag where lower(tag) = lower(trim(q)))
      or exists (
        select 1 from public.ingredients i
        where i.recipe_id = r.id and lower(i.name) like '%' || lower(trim(q)) || '%'
      )
    )
  order by extensions.word_similarity(lower(trim(q)), lower(r.title)) desc, r.updated_at desc
  limit 100;
$$;

-- Public share link: returns one recipe by its unguessable slug, nothing else.
create or replace function public.get_shared_recipe(slug uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'recipe', to_jsonb(r) - 'user_id' - 'last_opened_at',
    'ingredients', coalesce((select jsonb_agg(to_jsonb(i) - 'user_id' order by i.position)
                             from public.ingredients i where i.recipe_id = r.id), '[]'::jsonb),
    'steps', coalesce((select jsonb_agg(to_jsonb(s) - 'user_id' order by s.position)
                       from public.steps s where s.recipe_id = r.id), '[]'::jsonb)
  )
  from public.recipes r
  where r.share_slug is not null and r.share_slug = slug;
$$;
revoke execute on function public.get_shared_recipe(uuid) from public;
grant execute on function public.get_shared_recipe(uuid) to anon, authenticated;

-- Account deletion: removes the caller's auth user; every table cascades.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Keep-alive probe for the daily health check. Touches no user data.
create or replace function public.health()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select 'ok'::text $$;
grant execute on function public.health() to anon, authenticated;

-- Storage -----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: files are served by URL without a select policy, so no
-- broad select policy is added (that would let anyone list every file).
create policy "recipe images own select" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "recipe images own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "recipe images own update" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "recipe images own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
