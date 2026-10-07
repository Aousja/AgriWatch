-- M08: use the existing web complaints table for Firebase mobile reports.
-- Transactional cutover from the three confirmed live complaint policies.
begin;

do $$
declare
  complaints_oid oid;
  authenticated_oid oid;
  user_id_type text;
  user_id_not_null boolean;
  ref_type text;
  ref_not_null boolean;
  ref_default text;
  status_default text;
  update_qual text;
begin
  if to_regclass('public.complaints') is null
     or to_regprocedure('public.is_agriwatch_admin(uuid)') is null then
    raise exception 'M08 requires the existing complaints table and admin membership function.';
  end if;
  complaints_oid := 'public.complaints'::regclass;
  select oid into authenticated_oid from pg_roles where rolname = 'authenticated';
  if authenticated_oid is null then
    raise exception 'authenticated role is missing.';
  end if;

  select format_type(a.atttypid, a.atttypmod), a.attnotnull
    into user_id_type, user_id_not_null
  from pg_attribute a
  where a.attrelid = complaints_oid and a.attname = 'user_id' and not a.attisdropped;
  select format_type(a.atttypid, a.atttypmod), a.attnotnull,
         pg_get_expr(d.adbin, d.adrelid)
    into ref_type, ref_not_null, ref_default
  from pg_attribute a
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = complaints_oid and a.attname = 'ref' and not a.attisdropped;
  select pg_get_expr(d.adbin, d.adrelid) into status_default
  from pg_attribute a
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = complaints_oid and a.attname = 'status' and not a.attisdropped;
  if user_id_type is distinct from 'uuid' or user_id_not_null is distinct from false
     or ref_type is distinct from 'text' or ref_not_null is distinct from true
     or ref_default is not null
     or status_default is null
     or status_default not in ('''Under Review''::text', '''Under Review''') then
    raise exception 'Live complaints columns/defaults differ from the confirmed M08 shape.';
  end if;
  if exists (
    select 1 from pg_attribute
    where attrelid = complaints_oid and attname in ('firebase_uid', 'crop_type')
      and not attisdropped
  ) then
    raise exception 'M08 complaint columns already exist; inspect before applying.';
  end if;

  if (select count(*) from pg_policy where polrelid = complaints_oid) <> 3
     or exists (
       select 1 from pg_policy p
       where p.polrelid = complaints_oid
         and not (
           (p.polname::text = 'authenticated create complaint' and p.polcmd = 'a')
           or (p.polname::text = 'authenticated read complaints' and p.polcmd = 'r')
           or (p.polname::text = 'staff update complaints' and p.polcmd = 'w')
         )
     )
     or exists (
       select 1 from pg_policy p
       where p.polrelid = complaints_oid
         and p.polroles <> array[authenticated_oid]
     ) then
    raise exception 'Expected exactly the three authenticated complaint policies with INSERT, SELECT, UPDATE commands.';
  end if;
  if not exists (
    select 1 from pg_policy p
    where p.polrelid = complaints_oid
      and p.polname::text = 'authenticated read complaints'
      and pg_get_expr(p.polqual, p.polrelid) = 'true'
  ) then
    raise exception 'Existing complaint SELECT policy is not USING true.';
  end if;
  select lower(pg_get_expr(p.polqual, p.polrelid)) into update_qual
  from pg_policy p
  where p.polrelid = complaints_oid and p.polname::text = 'staff update complaints';
  if update_qual is null
     or position('is_agriwatch_admin' in update_qual) = 0
     or position('auth.uid()' in update_qual) = 0
     or position('website_signup_requests' in update_qual) = 0
     or position('pdma' in update_qual) = 0
     or position('approved' in update_qual) = 0
     or update_qual !~ '(^|[[:space:]])or([[:space:]]|$)' then
    raise exception 'Existing complaint UPDATE policy does not match the confirmed admin/signup expression.';
  end if;
  if to_regprocedure('public.agriwatch_complaints_web_uid_v1()') is not null
     or to_regprocedure('public.agriwatch_complaints_staff_v1()') is not null then
    raise exception 'M08 helper already exists; inspect before rerunning.';
  end if;
end $$;

alter table public.complaints add column firebase_uid text;
alter table public.complaints add column crop_type text;
alter table public.complaints alter column ref set default
  ('CMP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)));
create index complaints_firebase_uid_created_at_idx
  on public.complaints (firebase_uid, created_at desc)
  where firebase_uid is not null;

-- A Supabase web identity has a UUID subject and a Supabase Auth issuer.
-- Firebase subjects remain text and never pass through a UUID cast.
create function public.agriwatch_complaints_web_uid_v1()
returns uuid language sql stable security definer
set search_path = pg_catalog, public
as $function$
  select case
    when auth.jwt() ->> 'iss' = 'https://gtbfmrefgwodphjurvdq.supabase.co/auth/v1'
     and auth.jwt() ->> 'sub' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (auth.jwt() ->> 'sub')::uuid
    else null::uuid
  end;
$function$;

-- Only the existing trusted admin allowlist grants complaint review.
-- website_signup_requests and unverified pdma_officers are not staff grants.
create function public.agriwatch_complaints_staff_v1()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $function$
  select case
    when public.agriwatch_complaints_web_uid_v1() is null then false
    else coalesce(public.is_agriwatch_admin(
      public.agriwatch_complaints_web_uid_v1()
    ), false)
  end;
$function$;

revoke all on function public.agriwatch_complaints_web_uid_v1() from public, anon;
revoke all on function public.agriwatch_complaints_staff_v1() from public, anon;
grant execute on function public.agriwatch_complaints_web_uid_v1() to authenticated;
grant execute on function public.agriwatch_complaints_staff_v1() to authenticated;

drop policy "authenticated create complaint" on public.complaints;
drop policy "authenticated read complaints" on public.complaints;
drop policy "staff update complaints" on public.complaints;
alter table public.complaints enable row level security;

create policy "M08 complaint owner or staff read" on public.complaints
  for select to authenticated using (
    public.agriwatch_complaints_staff_v1()
    or (firebase_uid is null
        and user_id = public.agriwatch_complaints_web_uid_v1())
    or (user_id is null and firebase_uid = auth.jwt() ->> 'sub'
        and auth.jwt() ->> 'role' = 'authenticated'
        and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
        and auth.jwt() ->> 'aud' = 'agriwatch-pakistan')
  );

create policy "M08 complaint owner insert" on public.complaints
  for insert to authenticated with check (
    status = 'Under Review' and resolution_note is null and handled_by is null
    and (
      (firebase_uid is null
       and user_id = public.agriwatch_complaints_web_uid_v1())
      or (user_id is null and firebase_uid = auth.jwt() ->> 'sub'
          and auth.jwt() ->> 'role' = 'authenticated'
          and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
          and auth.jwt() ->> 'aud' = 'agriwatch-pakistan')
    )
  );

create policy "M08 complaint staff update" on public.complaints
  for update to authenticated
  using (public.agriwatch_complaints_staff_v1())
  with check (public.agriwatch_complaints_staff_v1());

-- Remove the old blanket grants and any column grants before adding back
-- only the fields each client needs. RLS then limits each authenticated row.
revoke all on table public.complaints from public, anon, authenticated;
do $$
declare c record;
begin
  for c in select attname from pg_attribute
    where attrelid = 'public.complaints'::regclass
      and attnum > 0 and not attisdropped
  loop
    execute format(
      'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on table public.complaints from public, anon, authenticated',
      c.attname
    );
  end loop;
end $$;
grant select on table public.complaints to authenticated;
grant insert (
  ref, user_id, firebase_uid, reporter_name, reporter_role,
  reporter_phone, district, category, crop_type, description, photo_url
) on table public.complaints to authenticated;
grant update (status, resolution_note, handled_by, updated_at)
  on table public.complaints to authenticated;

-- Deny public/anon reads and writes even if a policy is later added by mistake.
do $$
begin
  if has_table_privilege('anon', 'public.complaints', 'SELECT')
     or has_table_privilege('anon', 'public.complaints', 'INSERT')
     or has_table_privilege('anon', 'public.complaints', 'UPDATE') then
    raise exception 'Anonymous complaint access remains; rolling back M08.';
  end if;
  if not has_table_privilege('authenticated', 'public.complaints', 'SELECT')
     or not has_column_privilege('authenticated', 'public.complaints', 'status', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.complaints', 'resolution_note', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.complaints', 'handled_by', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.complaints', 'updated_at', 'UPDATE')
     or has_column_privilege('authenticated', 'public.complaints', 'status', 'INSERT') then
    raise exception 'Complaint grants do not match the web review and protected mobile insert paths.';
  end if;
end $$;

commit;
