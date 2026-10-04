-- Proposed migration for Firebase-authenticated mobile access requests.
-- Do not run until the preflight, web-flow dependency, and phone test are
-- approved. This keeps the existing shared public.access_requests table.
-- Firebase UIDs remain text and are compared with auth.jwt() ->> 'sub'.
-- The global auth.uid() function is not changed.

begin;

-- All validation is intentionally before the first schema, grant, function, or
-- policy mutation. Any failure aborts this transaction before changes commit.
do $$
declare
  access_table oid;
  missing_columns text;
  policy_record record;
  expected record;
  expected_policy_names text[] := array[
    'admins can view access_requests',
    'admins read access requests',
    'admins can update access_requests',
    'admins update access requests'
  ];
begin
  select rel.oid
  into access_table
  from pg_class rel
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'access_requests'
    and rel.relkind = 'r';

  if access_table is null then
    raise exception 'public.access_requests does not exist.';
  end if;

  select string_agg(required_column, ', ' order by required_column)
  into missing_columns
  from (values
    ('id'),
    ('name'),
    ('role'),
    ('district'),
    ('phone'),
    ('status'),
    ('submitted_at')
  ) as required_columns(required_column)
  where not exists (
    select 1
    from pg_attribute attr
    where attr.attrelid = access_table
      and attr.attname = required_column
      and not attr.attisdropped
  );

  if missing_columns is not null then
    raise exception
      'Existing web columns are missing from public.access_requests: %',
      missing_columns;
  end if;

  if exists (
    select 1
    from (values
      ('firebase_uid'),
      ('organization_name'),
      ('designation'),
      ('reason'),
      ('cnic'),
      ('province'),
      ('department'),
      ('employee_id'),
      ('official_email'),
      ('organization_type'),
      ('registration_number'),
      ('operational_province'),
      ('operational_district')
    ) as mobile_columns(column_name)
    join pg_attribute attr
      on attr.attrelid = access_table
     and attr.attname = column_name
     and not attr.attisdropped
    where format_type(attr.atttypid, attr.atttypmod) <> 'text'
  ) then
    raise exception
      'An existing mobile access-request column has a non-text type.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.access_requests',
    'SELECT'
  ) then
    raise exception
      'authenticated lacks SELECT on public.access_requests; web admin reads cannot be preserved.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.access_requests',
    'UPDATE'
  ) then
    raise exception
      'authenticated lacks UPDATE on public.access_requests; web admin status updates cannot be preserved.';
  end if;

  select
    pol.polroles
  into policy_record
  from pg_policy pol
  where pol.polrelid = access_table
    and pol.polname::text = 'mobile can create access request'
    and pol.polcmd = 'a';

  if not found then
    raise exception
      'Expected INSERT policy "mobile can create access request" was not found.';
  end if;

  if not (
    policy_record.polroles && array[
      0::oid,
      'anon'::regrole::oid,
      'authenticated'::regrole::oid
    ]::oid[]
  ) then
    raise exception
      'INSERT policy "mobile can create access request" is not public/anon/authenticated as expected.';
  end if;

  if exists (
    select 1
    from pg_policy pol
    where pol.polrelid = access_table
      and pol.polcmd = 'a'
      and pol.polroles && array[
        0::oid,
        'anon'::regrole::oid,
        'authenticated'::regrole::oid
      ]::oid[]
      and pol.polname::text <> 'mobile can create access request'
  ) then
    raise exception
      'Unexpected public/authenticated INSERT policy exists on access_requests.';
  end if;

  if exists (
    select 1
    from pg_policy pol
    where pol.polrelid = access_table
      and pol.polcmd in ('r', 'w', 'd', '*')
      and pol.polroles && array[
        0::oid,
        'anon'::regrole::oid
      ]::oid[]
      and pol.polname::text not in (
        'admins can view access_requests',
        'admins can update access_requests'
      )
  ) then
    raise exception
      'Unexpected public/anon read, update, or delete policy exists on access_requests.';
  end if;

  for expected in
    select *
    from (values
      ('admins can view access_requests', 'r'),
      ('admins read access requests', 'r'),
      ('admins can update access_requests', 'w'),
      ('admins update access requests', 'w')
    ) as expected_policy(policy_name, policy_command)
  loop
    select
      pol.polname,
      pol.polcmd,
      pol.polpermissive,
      pol.polroles,
      pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
    into policy_record
    from pg_policy pol
    where pol.polrelid = access_table
      and pol.polname::text = expected.policy_name;

    if not found then
      raise exception
        'Expected access_requests policy % was not found.',
        expected.policy_name;
    end if;

    if policy_record.polcmd <> expected.policy_command::"char" then
      raise exception
        'Policy % has command code %, expected %.',
        expected.policy_name,
        policy_record.polcmd,
        expected.policy_command;
    end if;

    if policy_record.polroles is null
       or cardinality(policy_record.polroles) = 0 then
      raise exception
        'Policy % has no role list.',
        expected.policy_name;
    end if;

    if expected.policy_name in (
      'admins can view access_requests',
      'admins can update access_requests'
    ) then
      if cardinality(policy_record.polroles) <> 1
         or policy_record.polroles[1] <> 0::oid then
        raise exception
          'Known PUBLIC admin policy % must retain exactly the PUBLIC role.',
          expected.policy_name;
      end if;
    elsif policy_record.polroles && array[
      0::oid,
      'anon'::regrole::oid
    ]::oid[] then
      raise exception
        'Admin policy % unexpectedly applies to public or anon.',
        expected.policy_name;
    end if;

    if policy_record.using_expression is null then
      raise exception
        'Policy % has no USING expression.',
        expected.policy_name;
    end if;

    if expected.policy_command = 'r'
       and policy_record.check_expression is not null then
      raise exception
        'SELECT policy % unexpectedly has a WITH CHECK expression.',
        expected.policy_name;
    end if;

    if not (
      policy_record.using_expression
        ~* 'auth[[:space:]]*[.][[:space:]]*uid[[:space:]]*[(]'
      or coalesce(policy_record.check_expression, '')
        ~* 'auth[[:space:]]*[.][[:space:]]*uid[[:space:]]*[(]'
    ) then
      raise exception
        'Policy % does not contain the expected auth.uid() check.',
        expected.policy_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policy pol
    where pol.polrelid = access_table
      and pol.polcmd in ('r', 'w', '*')
      and pol.polname::text <> all(expected_policy_names)
      and (
        pg_get_expr(pol.polqual, pol.polrelid)
          ~* 'auth[[:space:]]*[.][[:space:]]*uid[[:space:]]*[(]'
        or pg_get_expr(pol.polwithcheck, pol.polrelid)
          ~* 'auth[[:space:]]*[.][[:space:]]*uid[[:space:]]*[(]'
      )
  ) then
    raise exception
      'Unexpected access_requests policy containing auth.uid() exists.';
  end if;
end;
$$;

alter table public.access_requests
  add column if not exists firebase_uid text,
  add column if not exists organization_name text,
  add column if not exists designation text,
  add column if not exists reason text,
  add column if not exists cnic text,
  add column if not exists province text,
  add column if not exists department text,
  add column if not exists employee_id text,
  add column if not exists official_email text,
  add column if not exists organization_type text,
  add column if not exists registration_number text,
  add column if not exists operational_province text,
  add column if not exists operational_district text;

alter table public.access_requests
  alter column status set default 'pending',
  alter column submitted_at set default now();

create or replace function public.is_agriwatch_firebase_request()
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select auth.jwt() ->> 'role' = 'authenticated'
    and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
    and auth.jwt() ->> 'aud' = 'agriwatch-pakistan';
$$;

revoke all on function public.is_agriwatch_firebase_request() from public;
grant execute on function public.is_agriwatch_firebase_request()
  to authenticated;

drop policy "mobile can create access request"
  on public.access_requests;

-- Guard only the four known web-admin policies after the preflight.
-- Their original roles, mode, USING expression, and optional WITH CHECK
-- expression are preserved for Supabase Auth users.
do $$
declare
  expected record;
  policy_record record;
  policy_roles text;
  policy_using text;
  policy_check text;
  policy_kind text;
begin
  for expected in
    select *
    from (values
      ('admins can view access_requests', 'r'),
      ('admins read access requests', 'r'),
      ('admins can update access_requests', 'w'),
      ('admins update access requests', 'w')
    ) as expected_policy(policy_name, policy_command)
  loop
    select
      pol.polname,
      pol.polcmd,
      pol.polpermissive,
      pol.polroles,
      pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
    into policy_record
    from pg_policy pol
    join pg_class rel on rel.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'access_requests'
      and pol.polname::text = expected.policy_name;

    select string_agg(
      case
        when role_oid = 0 then 'public'
        else quote_ident(pg_get_userbyid(role_oid))
      end,
      ', ' order by role_oid
    )
    into policy_roles
    from unnest(policy_record.polroles) as role_list(role_oid);

    policy_kind := case
      when policy_record.polpermissive then 'permissive'
      else 'restrictive'
    end;

    policy_using := format(
      'case when public.is_agriwatch_firebase_request() then false else (%s) end',
      policy_record.using_expression
    );

    policy_check := format(
      'case when public.is_agriwatch_firebase_request() then false else (%s) end',
      coalesce(
        policy_record.check_expression,
        policy_record.using_expression
      )
    );

    execute format(
      'drop policy %I on public.access_requests',
      policy_record.polname
    );

    if policy_record.polcmd = 'r' then
      execute format(
        'create policy %I on public.access_requests as %s for select to %s using (%s)',
        policy_record.polname,
        policy_kind,
        policy_roles,
        policy_using
      );
    else
      if policy_record.check_expression is null then
        execute format(
          'create policy %I on public.access_requests as %s for update to %s using (%s)',
          policy_record.polname,
          policy_kind,
          policy_roles,
          policy_using
        );
      else
        execute format(
          'create policy %I on public.access_requests as %s for update to %s using (%s) with check (%s)',
          policy_record.polname,
          policy_kind,
          policy_roles,
          policy_using,
          policy_check
        );
      end if;
    end if;
  end loop;
end;
$$;



-- Keep web/admin reads and status updates working through authenticated grants
-- and policies. Remove public/anon table privileges explicitly; the old
-- public INSERT policy is also removed below. The explicit Firebase INSERT
-- policy is the only client INSERT path.
revoke select, insert, update, delete
  on table public.access_requests
  from public, anon;
revoke insert on table public.access_requests from authenticated;
grant select, update on table public.access_requests to authenticated;
grant insert (
  firebase_uid,
  name,
  role,
  district,
  phone,
  organization_name,
  designation,
  reason,
  cnic,
  province,
  department,
  employee_id,
  official_email,
  organization_type,
  registration_number,
  operational_province,
  operational_district
) on table public.access_requests to authenticated;

drop policy if exists "mobile firebase access requests insert own"
  on public.access_requests;
create policy "mobile firebase access requests insert own"
  on public.access_requests
  for insert
  to authenticated
  with check (
    public.is_agriwatch_firebase_request()
    and firebase_uid = auth.jwt() ->> 'sub'
    and role in ('officer', 'ngo')
    and status = 'pending'
  );

drop policy if exists "mobile firebase access requests read own"
  on public.access_requests;
create policy "mobile firebase access requests read own"
  on public.access_requests
  for select
  to authenticated
  using (
    public.is_agriwatch_firebase_request()
    and firebase_uid = auth.jwt() ->> 'sub'
  );

-- These restrictive policies ensure that any other broad policy cannot widen
-- Firebase access. Existing Supabase Auth web-admin policies continue to
-- govern non-Firebase JWTs after their auth.uid() expressions are guarded.
drop policy if exists "mobile firebase access request select scope"
  on public.access_requests;
create policy "mobile firebase access request select scope"
  on public.access_requests
  as restrictive
  for select
  to authenticated
  using (
    not public.is_agriwatch_firebase_request()
    or firebase_uid = auth.jwt() ->> 'sub'
  );

drop policy if exists "mobile firebase access request insert scope"
  on public.access_requests;
create policy "mobile firebase access request insert scope"
  on public.access_requests
  as restrictive
  for insert
  to authenticated
  with check (
    not public.is_agriwatch_firebase_request()
    or (
      firebase_uid = auth.jwt() ->> 'sub'
      and role in ('officer', 'ngo')
      and status = 'pending'
    )
  );

-- Firebase clients cannot update or delete requests. Web/admin users retain
-- the existing UUID-based review policies because their issuer is non-Firebase.
drop policy if exists "mobile firebase access request update scope"
  on public.access_requests;
create policy "mobile firebase access request update scope"
  on public.access_requests
  as restrictive
  for update
  to authenticated
  using (not public.is_agriwatch_firebase_request())
  with check (not public.is_agriwatch_firebase_request());

drop policy if exists "mobile firebase access request delete scope"
  on public.access_requests;
create policy "mobile firebase access request delete scope"
  on public.access_requests
  as restrictive
  for delete
  to authenticated
  using (not public.is_agriwatch_firebase_request());

commit;
