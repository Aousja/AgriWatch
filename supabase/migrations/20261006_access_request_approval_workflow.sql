-- Trusted officer/NGO approval workflow for Firebase-backed mobile users.
-- Apply only after the replacement dashboard and review endpoint are deployed
-- and ready. This migration removes the old browser status-update path.

begin;

-- Check the required schema and policy shape before changing objects.
do $$
declare
  access_requests_oid oid;
  profiles_oid oid;
  profile_role_constraint text;
  access_granted_type text;
begin
  select rel.oid
  into access_requests_oid
  from pg_class rel
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'access_requests'
    and rel.relkind = 'r';

  if access_requests_oid is null then
    raise exception 'public.access_requests does not exist.';
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = access_requests_oid
      and attname = 'id'
      and not attisdropped
      and format_type(atttypid, atttypmod) = 'uuid'
  ) then
    raise exception 'public.access_requests.id must be uuid.';
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = access_requests_oid
      and attname = 'firebase_uid'
      and not attisdropped
      and format_type(atttypid, atttypmod) = 'text'
  ) then
    raise exception 'public.access_requests.firebase_uid must be text.';
  end if;

  if not exists (
    select 1 from pg_policy
    where polrelid = access_requests_oid
      and polname::text = 'admins can view access_requests'
      and polcmd = 'r'
      and polroles = array[0::oid]
  ) then
    raise exception 'Expected PUBLIC SELECT policy was not found.';
  end if;

  if not exists (
    select 1 from pg_policy
    where polrelid = access_requests_oid
      and polname::text = 'admins can update access_requests'
      and polcmd = 'w'
      and polroles = array[0::oid]
  ) then
    raise exception 'Expected PUBLIC UPDATE policy was not found.';
  end if;

  if to_regprocedure('public.is_agriwatch_admin(uuid)') is null then
    raise exception 'Required existing admin membership function was not found.';
  end if;

  if to_regprocedure('public.agriwatch_review_web_admin_v1(uuid)') is not null then
    raise exception 'Review admin RPC already exists; inspect before applying.';
  end if;

  select rel.oid
  into profiles_oid
  from pg_class rel
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'mobile_firebase_profiles'
    and rel.relkind = 'r';

  if profiles_oid is null then
    raise exception 'public.mobile_firebase_profiles does not exist.';
  end if;

  select conname
  into profile_role_constraint
  from pg_constraint
  where conrelid = profiles_oid
    and conname = 'mobile_firebase_profiles_role_check'
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%citizen%'
    and pg_get_constraintdef(oid) like '%farmer%'
    and pg_get_constraintdef(oid) like '%pdma_officer%'
    and pg_get_constraintdef(oid) like '%admin%';

  if profile_role_constraint is null then
    raise exception
      'Unexpected mobile_firebase_profiles role constraint; refusing to rewrite it.';
  end if;

  select format_type(atttypid, atttypmod)
  into access_granted_type
  from pg_attribute
  where attrelid = profiles_oid
    and attname = 'access_granted'
    and not attisdropped;

  if access_granted_type is not null
     and access_granted_type is distinct from 'boolean' then
    raise exception 'mobile_firebase_profiles.access_granted must be boolean.';
  end if;

  if to_regclass('public.access_request_approval_runs') is not null then
    raise exception
      'public.access_request_approval_runs already exists; inspect before applying.';
  end if;

  if to_regprocedure(
    'public.agriwatch_access_request_approval_runs_updated_at_v1()'
  ) is not null then
    raise exception 'Approval-run trigger helper already exists; refusing to overwrite it.';
  end if;
end;
$$;

alter table public.mobile_firebase_profiles
  drop constraint mobile_firebase_profiles_role_check;

alter table public.mobile_firebase_profiles
  add constraint mobile_firebase_profiles_role_check
  check (role in ('citizen', 'farmer', 'pdma_officer', 'ngo', 'admin'));

alter table public.mobile_firebase_profiles
  add column if not exists access_granted boolean not null default false;

create table public.access_request_approval_runs (
  request_id uuid primary key
    references public.access_requests(id)
    on delete cascade,
  firebase_uid text not null,
  requested_role text not null
    check (requested_role in ('officer', 'ngo')),
  target_profile_role text
    check (target_profile_role is null or target_profile_role in ('pdma_officer', 'ngo')),
  state text not null default 'processing'
    check (state in ('processing', 'granted', 'rejected', 'failed', 'recovery_required')),
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  previous_profile_exists boolean not null default false,
  previous_profile_role text,
  previous_access_granted boolean not null default false,
  previous_claim_role text,
  previous_claim_role_present boolean not null default false,
  approved_by uuid,
  started_at timestamptz,
  granted_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.agriwatch_access_request_approval_runs_updated_at_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create trigger access_request_approval_runs_updated_at
before update on public.access_request_approval_runs
for each row
execute function public.agriwatch_access_request_approval_runs_updated_at_v1();

alter table public.access_request_approval_runs enable row level security;

revoke all on table public.access_request_approval_runs
  from public, anon, authenticated;
grant select, insert, update on table public.access_request_approval_runs
  to service_role;
revoke all on function public.agriwatch_access_request_approval_runs_updated_at_v1()
  from public, anon, authenticated;

-- The endpoint calls the same admins-membership rule as the existing web
-- policies. Only the service role may invoke this RPC.
create function public.agriwatch_review_web_admin_v1(candidate_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select coalesce(public.is_agriwatch_admin(candidate_uid), false);
$function$;

revoke all on function public.agriwatch_review_web_admin_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.agriwatch_review_web_admin_v1(uuid)
  to service_role;

-- Browser users retain SELECT for dashboard reads and Firebase own-row reads,
-- but cannot directly change status. The trusted server uses service-role
-- access after validating the Supabase web-admin session.
revoke update on table public.access_requests
  from public, anon, authenticated;
revoke update (status) on table public.access_requests
  from public, anon, authenticated;
grant select on table public.access_requests to authenticated;
grant select on table public.access_requests to service_role;
grant update (status) on table public.access_requests to service_role;
grant select, insert, update, delete on table public.mobile_firebase_profiles
  to service_role;

-- Check effective privileges, including grants inherited through other roles.
-- Abort the transaction if either browser role can still change status.
do $$
begin
  if has_function_privilege('anon', 'public.agriwatch_review_web_admin_v1(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.agriwatch_review_web_admin_v1(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.agriwatch_review_web_admin_v1(uuid)', 'EXECUTE') then
    raise exception 'Review admin RPC must be executable only by the service role.';
  end if;

  if has_column_privilege('anon', 'public.access_requests', 'status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.access_requests', 'status', 'UPDATE') then
    raise exception 'Browser role still has UPDATE privilege on access_requests.status.';
  end if;

  if not has_column_privilege('service_role', 'public.access_requests', 'status', 'UPDATE') then
    raise exception 'Service role cannot update access_requests.status.';
  end if;
end;
$$;

commit;
