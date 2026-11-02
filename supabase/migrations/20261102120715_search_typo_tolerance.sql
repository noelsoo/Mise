-- The default trigram threshold (0.6) misses typos like "chiken brest". Compare scores explicitly at 0.4.
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
    and extensions.word_similarity(term.t, lower(f.name)) >= 0.4
  order by score desc
  limit least(greatest(max_results, 1), 50);
$$;

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
      or extensions.word_similarity(lower(trim(q)), lower(r.title)) >= 0.4
      or exists (select 1 from unnest(r.tags) tag where lower(tag) = lower(trim(q)))
      or exists (
        select 1 from public.ingredients i
        where i.recipe_id = r.id and lower(i.name) like '%' || lower(trim(q)) || '%'
      )
    )
  order by extensions.word_similarity(lower(trim(q)), lower(r.title)) desc, r.updated_at desc
  limit 100;
$$;

