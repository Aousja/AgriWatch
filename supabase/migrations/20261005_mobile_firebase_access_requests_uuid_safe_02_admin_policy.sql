-- Final applied policy record for the shared public.access_requests table.
--
-- Migration order:
--   1. 20261004_mobile_firebase_access_requests.sql
--      Adds mobile columns, Firebase ownership policies, and the Firebase
--      issuer guard while preserving the existing web-admin policies.
--   2. 20261005_mobile_firebase_access_requests_uuid_safe.sql
--      Adds the UUID-safe Supabase Auth helper and removes direct auth.uid()
--      calls from the four known admin policies.
--   3. This migration records the final change applied to the two known
--      PUBLIC admin policies. Their USING expressions call
--      is_agriwatch_admin(agriwatch_access_requests_supabase_auth_uid_v1()).
--
-- Test result recorded on 2026-10-05:
--   The existing officer row remained role=officer and status=pending.
--   After the final policy change, the Firebase-authenticated phone showed
--   "Request pending review" after restart. No new request was submitted.
--   No request was approved and no role was granted.
--
-- This file has not been executed by this repository operation.

begin;

-- Preflight only the existing helper, admin function, and two named PUBLIC
-- policies before changing either policy.
do $$
declare
  access_table oid;
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
    'public.is_agriwatch_admin(uuid)'
  ) is null then
    raise exception
      'Required existing function public.is_agriwatch_admin(uuid) was not found.';
  end if;

  if to_regprocedure(
    'public.agriwatch_access_requests_supabase_auth_uid_v1()'
  ) is null then
    raise exception
      'Required existing helper public.agriwatch_access_requests_supabase_auth_uid_v1() was not found.';
  end if;

  if not exists (
    select 1
    from pg_policy pol
    where pol.polrelid = access_table
      and pol.polname::text = 'admins can view access_requests'
      and pol.polcmd = 'r'
      and pol.polroles = array[0::oid]
  ) then
    raise exception
      'Expected PUBLIC SELECT policy "admins can view access_requests" was not found.';
  end if;

  if not exists (
    select 1
    from pg_policy pol
    where pol.polrelid = access_table
      and pol.polname::text = 'admins can update access_requests'
      and pol.polcmd = 'w'
      and pol.polroles = array[0::oid]
  ) then
    raise exception
      'Expected PUBLIC UPDATE policy "admins can update access_requests" was not found.';
  end if;
end;
$$;

-- These are the exact final policy expressions applied to the two known
-- PUBLIC policies. ALTER POLICY preserves their names, roles, command types,
-- permissive/restrictive mode, and any existing UPDATE WITH CHECK expression.
alter policy "admins can view access_requests"
  on public.access_requests
  using (
    public.is_agriwatch_admin(
      public.agriwatch_access_requests_supabase_auth_uid_v1()
    )
  );

alter policy "admins can update access_requests"
  on public.access_requests
  using (
    public.is_agriwatch_admin(
      public.agriwatch_access_requests_supabase_auth_uid_v1()
    )
  );

commit;
