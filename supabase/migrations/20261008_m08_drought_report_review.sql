-- Prepared only. Requires the M08 shared-complaints baseline, NOT migration 6.
-- EXPANSION PHASE: temporary legacy submission/admin-write compatibility.
-- Finalization lives outside migrations/ so a batch cannot end the grace period.
-- No old categories, references, descriptions, or statuses are rewritten.
begin;

-- Serialize the exact catalog preflight and replacement; no unchecked gap.
lock table public.complaints in access exclusive mode;
do $$
declare
  status_attnum smallint;
  status_check record;
begin
  if to_regprocedure('public.agriwatch_complaints_staff_v1()') is null
     or to_regprocedure('public.agriwatch_complaints_web_uid_v1()') is null
     or not exists (select 1 from pg_attribute where attrelid = 'public.complaints'::regclass
       and attname = 'firebase_uid' and not attisdropped)
     or (select count(*) from pg_policy where polrelid = 'public.complaints'::regclass) <> 3
     or not exists (select 1 from pg_policy where polrelid = 'public.complaints'::regclass and polname = 'M08 complaint owner or staff read')
     or not exists (select 1 from pg_policy where polrelid = 'public.complaints'::regclass and polname = 'M08 complaint owner insert')
     or not exists (select 1 from pg_policy where polrelid = 'public.complaints'::regclass and polname = 'M08 complaint staff update') then
    raise exception 'Inspect live schema/RLS: the M08 shared complaints baseline is required.';
  end if;
  select attnum into status_attnum from pg_attribute
    where attrelid = 'public.complaints'::regclass and attname = 'status'
      and atttypid = 'text'::regtype and attnotnull and not attisdropped;
  select contype, convalidated, connoinherit, conkey,
         pg_get_constraintdef(oid, false) as definition into status_check
    from pg_constraint where conrelid = 'public.complaints'::regclass
      and conname = 'complaints_status_check';
  if status_attnum is null or not found
     or status_check.contype is distinct from 'c'
     or status_check.convalidated is distinct from true
     or status_check.connoinherit is distinct from false
     or status_check.conkey is distinct from array[status_attnum]::smallint[]
     or status_check.definition is distinct from
       'CHECK ((status = ANY (ARRAY[''Under Review''::text, ''Forwarded''::text, ''Resolved''::text])))'
     or exists (select 1 from pg_constraint
       where conrelid = 'public.complaints'::regclass and contype = 'c'
         and status_attnum = any(conkey) and conname <> 'complaints_status_check') then
    raise exception 'Expected exactly the validated complaints_status_check for Under Review, Forwarded, Resolved; inspect the actual catalog definition before proceeding.';
  end if;
  if (select pg_get_expr(d.adbin, d.adrelid)
      from pg_attrdef d where d.adrelid = 'public.complaints'::regclass
        and d.adnum = status_attnum) is distinct from '''Under Review''::text' then
    raise exception 'Expected the legacy Under Review status default during expansion.';
  end if;
end $$;

alter table public.complaints drop constraint complaints_status_check;
alter table public.complaints add constraint complaints_status_check check (
  status in ('Under Review', 'Forwarded', 'Resolved', 'Submitted', 'Assigned for PDMA review')
) not valid;
alter table public.complaints validate constraint complaints_status_check;

-- Separate complaint authorization, provisioned only by a trusted DB operator
-- after checking PDMA identity AND district authority. Signup rows are irrelevant.
create table public.agriwatch_pdma_report_permissions (
  user_id uuid not null references auth.users(id),
  district text not null check (length(btrim(district)) > 0 and district = btrim(district)),
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (user_id, district)
);
alter table public.agriwatch_pdma_report_permissions enable row level security;
revoke all on public.agriwatch_pdma_report_permissions from public, anon, authenticated;
grant select on public.agriwatch_pdma_report_permissions to authenticated;
create policy "Report permission self or admin read" on public.agriwatch_pdma_report_permissions
  for select to authenticated using (
    public.agriwatch_complaints_staff_v1()
    or user_id = public.agriwatch_complaints_web_uid_v1()
  );

alter table public.complaints
  add column review_started_at timestamptz,
  add column review_started_by uuid references auth.users(id),
  add column admin_responded_at timestamptz,
  add column admin_responded_by uuid references auth.users(id),
  add column pdma_assigned_at timestamptz,
  add column pdma_assigned_to uuid references auth.users(id),
  add column pdma_assigned_by uuid references auth.users(id),
  add column pdma_assignment_reason text,
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users(id);
-- Keep Under Review as the default until supported clients have upgraded.
-- No review timestamp exists on receipt: updated clients display it as pending.
create index complaints_pdma_assignment_idx on public.complaints (pdma_assigned_to, district)
  where pdma_assigned_at is not null;

create function public.agriwatch_report_pdma_read_v1(assigned_to uuid, area text, assigned_at timestamptz)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $function$
  select assigned_at is not null
    and assigned_to = public.agriwatch_complaints_web_uid_v1()
    and exists (select 1 from public.agriwatch_pdma_report_permissions p
      where p.user_id = assigned_to and p.district = area and p.active);
$function$;

drop policy "M08 complaint owner or staff read" on public.complaints;
create policy "M08 complaint owner admin or assigned PDMA read" on public.complaints
  for select to authenticated using (
    public.agriwatch_complaints_staff_v1()
    or public.agriwatch_report_pdma_read_v1(pdma_assigned_to, district, pdma_assigned_at)
    or (firebase_uid is null and user_id = public.agriwatch_complaints_web_uid_v1())
    or (user_id is null and firebase_uid = auth.jwt() ->> 'sub'
      and auth.jwt() ->> 'role' = 'authenticated'
      and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
      and auth.jwt() ->> 'aud' = 'agriwatch-pakistan')
  );
drop policy "M08 complaint owner insert" on public.complaints;
create policy "M08 drought report owner insert" on public.complaints
  for insert to authenticated with check (
    status in ('Submitted', 'Under Review') and resolution_note is null and handled_by is null
    and review_started_at is null and review_started_by is null
    and admin_responded_at is null and admin_responded_by is null
    and pdma_assigned_at is null and pdma_assigned_to is null and pdma_assigned_by is null
    and pdma_assignment_reason is null and resolved_at is null and resolved_by is null
    and (
      (firebase_uid is null and user_id = public.agriwatch_complaints_web_uid_v1())
      or (user_id is null and firebase_uid = auth.jwt() ->> 'sub'
        and auth.jwt() ->> 'role' = 'authenticated'
        and auth.jwt() ->> 'iss' = 'https://securetoken.google.com/agriwatch-pakistan'
        and auth.jwt() ->> 'aud' = 'agriwatch-pakistan')
    )
  );
-- Temporary compatibility for an explicit Under Review in old INSERT payloads.
-- RLS still rejects submitted-as-Forwarded/Resolved/Assigned payloads.
grant insert (status) on public.complaints to authenticated;

-- Preserve old allowlisted ADMIN web updates during web cutover. Never restore
-- signup-based PDMA writes. Clear blanket/column UPDATE grants, then restore
-- only these four legacy fields; action/assignment fields remain RPC-only.
revoke update on public.complaints from public, anon, authenticated;
do $$
declare c record;
begin
  for c in select attname from pg_attribute where attrelid = 'public.complaints'::regclass
    and attnum > 0 and not attisdropped
  loop
    execute format('revoke update (%I) on public.complaints from public, anon, authenticated', c.attname);
  end loop;
end $$;
grant update (status, resolution_note, handled_by, updated_at)
  on public.complaints to authenticated;
drop policy "M08 complaint staff update" on public.complaints;
create policy "M08 complaint staff update" on public.complaints
  for update to authenticated
  using (public.agriwatch_complaints_staff_v1())
  with check (public.agriwatch_complaints_staff_v1());

-- INSERT-only validation preserves all stored rows, including CMP-7A1E716B604A.
-- New clients already offer only drought categories. During the grace period,
-- accept the exact known old mobile/farmer/public choices and their old optional
-- fields without relabeling them or inventing review/referral actions.
create function public.agriwatch_validate_new_drought_report_v1()
returns trigger language plpgsql set search_path = pg_catalog, public
as $function$
begin
  if new.category in (
    'Pest infestation', 'Water shortage', 'Crop damage', 'Drought / weather', 'Other',
    'Crop Failure', 'Irrigation Shortage', 'Livestock Loss',
    'Water Shortage', 'Crop Damage', 'Well / Tubewell Dried Up', 'Relief Not Received'
  ) then
    return new;
  end if;
  if new.category is null or new.category not in (
    'Prolonged water shortage affecting an area or multiple farms',
    'Observed drought conditions affecting a community',
    'Incorrect or missing AgriWatch drought alert',
    'Other drought-related situation'
  ) or new.district is null or length(btrim(new.district)) = 0
    or new.description is null or length(btrim(new.description)) < 10 then
    raise exception 'Choose a drought category and district, and describe the situation (at least 10 characters).';
  end if;
  return new;
end;
$function$;
create trigger validate_new_drought_report before insert on public.complaints
  for each row execute function public.agriwatch_validate_new_drought_report_v1();

create function public.agriwatch_report_access_v1()
returns jsonb language sql stable security definer set search_path = pg_catalog, public
as $function$
  select jsonb_build_object('rollout_phase', 'compatibility',
    'admin', public.agriwatch_complaints_staff_v1(),
    'districts', coalesce((select jsonb_agg(p.district order by p.district)
      from public.agriwatch_pdma_report_permissions p
      where p.user_id = public.agriwatch_complaints_web_uid_v1() and p.active), '[]'::jsonb));
$function$;

create function public.agriwatch_report_reviewers_v1()
returns table(user_id uuid, district text) language plpgsql stable security definer
set search_path = pg_catalog, public
as $function$
begin
  if not public.agriwatch_complaints_staff_v1() then
    raise exception 'Authorized AgriWatch admin required.' using errcode = '42501';
  end if;
  return query select p.user_id, p.district from public.agriwatch_pdma_report_permissions p
    where p.active order by p.district, p.user_id;
end;
$function$;

create function public.agriwatch_review_report_v1(report_id uuid, action text,
  note text default '', assignee uuid default null, reason text default '')
returns public.complaints language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  actor uuid;
  report public.complaints;
begin
  if not public.agriwatch_complaints_staff_v1() then
    raise exception 'Authorized AgriWatch admin required.' using errcode = '42501';
  end if;
  actor := public.agriwatch_complaints_web_uid_v1();
  select * into report from public.complaints where id = report_id for update;
  if not found then raise exception 'Report not found.'; end if;
  if action = 'start_review' then
    if report.resolved_at is not null or report.status = 'Resolved' then raise exception 'Report is already resolved.'; end if;
    update public.complaints set
      review_started_at = coalesce(review_started_at, now()),
      review_started_by = coalesce(review_started_by, actor),
      status = case when pdma_assigned_at is null then 'Under Review' else status end,
      handled_by = actor::text, updated_at = now() where id = report_id;
  elsif action = 'respond' or action = 'resolve' then
    if note is null or length(btrim(note)) = 0 then raise exception 'An admin response is required.'; end if;
    if action = 'resolve' and (report.resolved_at is not null or report.status = 'Resolved') then
      raise exception 'Report is already resolved.';
    end if;
    update public.complaints set resolution_note = btrim(note),
      admin_responded_at = now(), admin_responded_by = actor,
      status = case when action = 'resolve' then 'Resolved' else status end,
      resolved_at = case when action = 'resolve' then now() else resolved_at end,
      resolved_by = case when action = 'resolve' then actor else resolved_by end,
      handled_by = actor::text, updated_at = now() where id = report_id;
  elsif action = 'assign' then
    if report.review_started_at is null or report.resolved_at is not null or report.status = 'Resolved' then
      raise exception 'Start admin review before assigning an unresolved serious drought report.';
    end if;
    if assignee is null or reason is null or length(btrim(reason)) < 10 then
      raise exception 'Verified reviewer and serious drought assessment are required.';
    end if;
    -- Lock the authority row so concurrent revocation cannot race this action.
    perform 1 from public.agriwatch_pdma_report_permissions p
      where p.user_id = assignee and p.district = report.district and p.active for share;
    if not found then raise exception 'Reviewer is not verified for this report district.' using errcode = '42501'; end if;
    update public.complaints set pdma_assigned_to = assignee,
      pdma_assigned_at = now(), pdma_assigned_by = actor,
      pdma_assignment_reason = btrim(reason), status = 'Assigned for PDMA review',
      handled_by = actor::text, updated_at = now() where id = report_id;
  else
    raise exception 'Unknown admin action.';
  end if;
  select * into report from public.complaints where id = report_id;
  return report;
end;
$function$;

revoke all on function public.agriwatch_report_pdma_read_v1(uuid,text,timestamptz) from public, anon;
revoke all on function public.agriwatch_validate_new_drought_report_v1() from public, anon, authenticated;
revoke all on function public.agriwatch_report_access_v1() from public, anon;
revoke all on function public.agriwatch_report_reviewers_v1() from public, anon;
revoke all on function public.agriwatch_review_report_v1(uuid,text,text,uuid,text) from public, anon;
grant execute on function public.agriwatch_report_pdma_read_v1(uuid,text,timestamptz) to authenticated;
grant execute on function public.agriwatch_report_access_v1() to authenticated;
grant execute on function public.agriwatch_report_reviewers_v1() to authenticated;
grant execute on function public.agriwatch_review_report_v1(uuid,text,text,uuid,text) to authenticated;

commit;
