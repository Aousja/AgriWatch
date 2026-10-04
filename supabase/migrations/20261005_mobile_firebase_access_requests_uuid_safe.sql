-- Follow-up for the already-applied Firebase access-request migration.
-- Do not run until the effective policy/function query has been reviewed.
-- This changes only the four known access_requests admin policies.
-- It does not change auth.uid(), RLS bypass behavior, or any row data.

begin;

-- Validate the live policy shape before any function or policy mutation.
do $$
declare
  access_table oid;
  auth_uid_return_type oid;
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

  if to_regprocedure(
    'public.agriwatch_access_requests_supabase_auth_uid_v1()'
  ) is not null then
    raise exception
      'Helper function public.agriwatch_access_requests_supabase_auth_uid_v1() already exists; refusing to overwrite it.';
  end if;

  select p.prorettype
  into auth_uid_return_type
  from pg_proc p
  join pg_namespace nsp on nsp.oid = p.pronamespace
  where nsp.nspname = 'auth'
    and p.proname = 'uid'
    and p.pronargs = 0;

  if auth_uid_return_type is distinct from 'uuid'::regtype::oid then
    raise exception
      'Expected auth.uid() returning uuid was not found.';
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

    if policy_record.using_expression is null then
      raise exception
        'Policy % has no USING expression.',
        expected.policy_name;
    end if;

    if policy_record.polroles is null
       or cardinality(policy_record.polroles) = 0 then
      raise exception
        'Policy % has no role list.',
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
        'Policy % does not contain the expected auth.uid() expression.',
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

-- This helper is deliberately PL/pgSQL so it is not inlined into the policy
-- expression. Only the exact Supabase Auth issuer reaches the UUID cast.
create function public.agriwatch_access_requests_supabase_auth_uid_v1()
returns uuid
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $function$
declare
  token_issuer text := auth.jwt() ->> 'iss';
  token_role text := auth.jwt() ->> 'role';
  token_sub text := auth.jwt() ->> 'sub';
begin
  if token_role is distinct from 'authenticated' then
    return null;
  end if;

  if token_issuer is distinct from
     'https://gtbfmrefgwodphjurvdq.supabase.co/auth/v1' then
    return null;
  end if;

  if token_sub is null
     or token_sub !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return token_sub::uuid;
end;
$function$;

revoke all on function public.agriwatch_access_requests_supabase_auth_uid_v1()
  from public;
grant execute on function public.agriwatch_access_requests_supabase_auth_uid_v1()
  to authenticated;

-- Preserve policy names, roles, command types, and all other expressions.
-- Only the unsafe auth.uid() call is replaced.
do $$
declare
  expected record;
  policy_record record;
  safe_using text;
  safe_check text;
begin
  for expected in
    select *
    from (values
      ('admins can view access_requests'),
      ('admins read access requests'),
      ('admins can update access_requests'),
      ('admins update access requests')
    ) as expected_policy(policy_name)
  loop
    select
      pol.polname,
      pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
      pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
    into policy_record
    from pg_policy pol
    join pg_class rel on rel.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'access_requests'
      and pol.polname::text = expected.policy_name;

    safe_using := regexp_replace(
      policy_record.using_expression,
      'auth[[:space:]]*[.][[:space:]]*uid[[:space:]]*[(][[:space:]]*[)]',
      'public.agriwatch_access_requests_supabase_auth_uid_v1()',
      'gi'
    );

    if safe_using = policy_record.using_expression then
      raise exception
        'Policy % auth.uid() replacement did not change USING.',
        expected.policy_name;
    end if;

    execute format(
      'alter policy %I on public.access_requests using (%s)',
      policy_record.polname,
      safe_using
    );

    if policy_record.check_expression is not null then
      safe_check := regexp_replace(
        policy_record.check_expression,
        'auth[[:space:]]*[.][[:space:]]*uid[[:space:]]*[(][[:space:]]*[)]',
        'public.agriwatch_access_requests_supabase_auth_uid_v1()',
        'gi'
      );

      if safe_check = policy_record.check_expression then
        raise exception
          'Policy % auth.uid() replacement did not change WITH CHECK.',
          expected.policy_name;
      end if;

      execute format(
        'alter policy %I on public.access_requests with check (%s)',
        policy_record.polname,
        safe_check
      );
    end if;
  end loop;
end;
$$;

commit;
