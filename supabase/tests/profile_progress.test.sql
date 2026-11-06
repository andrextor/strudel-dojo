begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Independent of whatever a local stack holds; the final rollback restores it.
delete from auth.users;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@dojo.test'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@dojo.test');

create function pg_temp.sign_in(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$insert into public.profile_progress (profile_id, name, color, created_at, progress)
    values ('p1', 'Iván', 'white', now(), '{"version":1}')$$,
  'a user adds a profile, owned by default'
);
select is((select count(*) from public.profile_progress), 1::bigint, 'and reads it');
select throws_ok(
  $$insert into public.profile_progress (user_id, profile_id, name, color, created_at, progress)
    values ('00000000-0000-0000-0000-00000000000b', 'p9', 'X', 'white', now(), '{}')$$,
  '42501', null, 'nobody writes a row for another user'
);

reset role;
select pg_temp.sign_in('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from public.profile_progress), 0::bigint, 'another user sees nothing');
update public.profile_progress set name = 'Hackeado';
delete from public.profile_progress;

reset role;
select is((select name from public.profile_progress), 'Iván', 'and changes nothing');
select is((select count(*) from public.profile_progress), 1::bigint, 'and deletes nothing');

set local role anon;
select throws_ok('select * from public.profile_progress', '42501', null, 'anon cannot read');
select throws_ok(
  $$insert into public.profile_progress (user_id, profile_id, name, color, created_at, progress)
    values ('00000000-0000-0000-0000-00000000000a', 'p2', 'X', 'white', now(), '{}')$$,
  '42501', null, 'anon cannot write'
);

reset role;
update public.profile_progress set updated_at = '2020-01-01', revision = 2;
select isnt(
  (select updated_at from public.profile_progress), '2020-01-01'::timestamptz,
  'updated_at is owned by the server'
);

select pg_temp.sign_in('00000000-0000-0000-0000-00000000000a');
update public.profile_progress set revision = 3 where profile_id = 'p1' and revision = 1;
select is((select revision from public.profile_progress), 2, 'a stale revision updates nothing');
select throws_ok(
  format(
    $$update public.profile_progress set progress = %L::jsonb$$,
    (select jsonb_build_object('blob', jsonb_agg(md5(i::text) || md5((i * 7)::text)))::text from generate_series(1, 200000) i)
  ),
  '23514', null, 'an oversized row is rejected'
);

select * from finish();
rollback;
