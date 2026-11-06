-- One row per profile with its whole progress: the client merges, the server only stores.
create table public.profile_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  profile_id text not null check (char_length(profile_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 24),
  color text not null,
  created_at timestamptz not null,
  progress jsonb not null,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id),
  constraint progress_size check (pg_column_size(progress) < 4000000)
);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;

create trigger profile_progress_touch
before update on public.profile_progress
for each row execute function public.touch_updated_at();

alter table public.profile_progress enable row level security;

create policy "read own profiles" on public.profile_progress
for select to authenticated using ((select auth.uid()) = user_id);

create policy "add own profiles" on public.profile_progress
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "change own profiles" on public.profile_progress
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "remove own profiles" on public.profile_progress
for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profile_progress from anon, public;
grant select, insert, update, delete on public.profile_progress to authenticated;
