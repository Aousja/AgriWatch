-- Test-only fixture for validating Firebase Auth -> Supabase JWT -> RLS.
-- Do not use this table for profiles, access requests, complaints, or images.

create table if not exists public.firebase_bridge_test_rows (
  id uuid primary key default gen_random_uuid(),
  owner_uid text not null,
  payload text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.firebase_bridge_test_rows enable row level security;

grant select, insert on table public.firebase_bridge_test_rows to authenticated;

drop policy if exists "bridge test users insert own rows"
  on public.firebase_bridge_test_rows;
create policy "bridge test users insert own rows"
  on public.firebase_bridge_test_rows
  for insert
  to authenticated
  with check (owner_uid = (auth.jwt() ->> 'sub'));

drop policy if exists "bridge test users read own rows"
  on public.firebase_bridge_test_rows;
create policy "bridge test users read own rows"
  on public.firebase_bridge_test_rows
  for select
  to authenticated
  using (owner_uid = (auth.jwt() ->> 'sub'));

comment on table public.firebase_bridge_test_rows is
  'Temporary isolated Firebase bridge verification fixture; drop after validation.';
