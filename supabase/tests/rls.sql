-- RLS isolation check. Runs in a transaction and rolls back, so it is safe on any project:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- Fails (raises) if user B can see or change user A's data.
begin;
insert into auth.users (id, email, aud, role, instance_id) values
  ('11111111-1111-1111-1111-111111111111', 'rls-a@test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'rls-b@test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.recipes (id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'A secret laksa');
insert into public.ingredients (recipe_id, raw, name) values ('aaaaaaaa-0000-0000-0000-000000000001', '200 g prawns', 'prawns');
insert into public.grocery_items (name) values ('prawns');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.recipes; if n <> 0 then raise exception 'B can read A recipes'; end if;
  select count(*) into n from public.ingredients; if n <> 0 then raise exception 'B can read A ingredients'; end if;
  select count(*) into n from public.grocery_items; if n <> 0 then raise exception 'B can read A grocery items'; end if;
  update public.recipes set title = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count; if n <> 0 then raise exception 'B can update A recipe'; end if;
  begin
    insert into public.ingredients (recipe_id, raw) values ('aaaaaaaa-0000-0000-0000-000000000001', 'injected');
    raise exception 'B can add ingredients to A recipe';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.profiles; if n <> 1 then raise exception 'B sees % profiles', n; end if;
  if public.get_shared_recipe('aaaaaaaa-0000-0000-0000-000000000001') is not null then raise exception 'unshared recipe readable by id'; end if;
end $$;
select 'RLS checks passed' as result;
rollback;
