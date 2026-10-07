-- First local-only profile migration for Firebase-authenticated mobile users.
-- Do not run until the mapping and RLS are approved.
-- This table is intentionally independent of auth.users because Firebase UIDs
-- are text values and must not be compared with auth.uid() (which is uuid).

create table if not exists public.mobile_firebase_profiles (
  firebase_uid text primary key,
  name text,
  phone_number text,
  email text,
  photo_url text,
  role text not null default 'citizen'
    check (role in ('citizen', 'farmer', 'pdma_officer', 'admin')),
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.mobile_firebase_profiles_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mobile_firebase_profiles_updated_at
  on public.mobile_firebase_profiles;
create trigger mobile_firebase_profiles_updated_at
before update on public.mobile_firebase_profiles
for each row
execute function public.mobile_firebase_profiles_set_updated_at();

alter table public.mobile_firebase_profiles enable row level security;

-- Restrict this table to the configured Firebase project. The hosted
-- Supabase integration also validates this before the request reaches RLS;
-- keeping the checks here documents and enforces the intended trust boundary.
drop policy if exists "mobile firebase profiles read own row"
  on public.mobile_firebase_profiles;
create policy "mobile firebase profiles read own row"
  on public.mobile_firebase_profiles
  for select
  to authenticated
  using (
    auth.role() = 'authenticated'
    and auth.jwt() ->> 'role' = 'authenticated'
    and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
    and auth.jwt() ->> 'aud' = 'agriwatch-pakistan'
    and firebase_uid = auth.jwt() ->> 'sub'
  );

drop policy if exists "mobile firebase profiles create own row"
  on public.mobile_firebase_profiles;
create policy "mobile firebase profiles create own row"
  on public.mobile_firebase_profiles
  for insert
  to authenticated
  with check (
    auth.role() = 'authenticated'
    and auth.jwt() ->> 'role' = 'authenticated'
    and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
    and auth.jwt() ->> 'aud' = 'agriwatch-pakistan'
    and firebase_uid = auth.jwt() ->> 'sub'
    and role in ('citizen', 'farmer')
  );

drop policy if exists "mobile firebase profiles update own row"
  on public.mobile_firebase_profiles;
create policy "mobile firebase profiles update own row"
  on public.mobile_firebase_profiles
  for update
  to authenticated
  using (
    auth.role() = 'authenticated'
    and auth.jwt() ->> 'role' = 'authenticated'
    and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
    and auth.jwt() ->> 'aud' = 'agriwatch-pakistan'
    and firebase_uid = auth.jwt() ->> 'sub'
  )
  with check (
    auth.role() = 'authenticated'
    and auth.jwt() ->> 'role' = 'authenticated'
    and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
    and auth.jwt() ->> 'aud' = 'agriwatch-pakistan'
    and firebase_uid = auth.jwt() ->> 'sub'
  );

-- Do not expose delete. Do not grant role, UID, or timestamp updates to the
-- client. The insert policy permits only the two client-selectable roles.
revoke all on table public.mobile_firebase_profiles from public, anon, authenticated;
grant select on table public.mobile_firebase_profiles to authenticated;
grant insert (
  firebase_uid,
  name,
  phone_number,
  email,
  photo_url,
  role,
  district
) on table public.mobile_firebase_profiles to authenticated;
grant update (
  name,
  phone_number,
  email,
  photo_url,
  district
) on table public.mobile_firebase_profiles to authenticated;

revoke all on function public.mobile_firebase_profiles_set_updated_at() from public;
grant execute on function public.mobile_firebase_profiles_set_updated_at()
  to authenticated;

