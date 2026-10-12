-- Additive PDMA actions after the M08 compatibility expansion.
-- Do not run migration 6 or finalization. Existing rows/defaults/categories stay intact.
begin;
lock table public.complaints in access exclusive mode;
do $$
begin
  if to_regprocedure('public.agriwatch_report_pdma_read_v1(uuid,text,timestamptz)') is null
     or to_regprocedure('public.agriwatch_review_report_v1(uuid,text,text,uuid,text)') is null
     or to_regclass('public.agriwatch_pdma_report_permissions') is null then
    raise exception 'The inspected M08 compatibility expansion is required.';
  end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.complaints'::regclass
      and attname = 'pdma_response_note' and not attisdropped) then
    raise exception 'PDMA actions already exist; inspect rather than reapplying.';
  end if;
end $$;

alter table public.complaints
  add column pdma_review_started_at timestamptz,
  add column pdma_review_started_by uuid references auth.users(id),
  add column pdma_response_note text,
  add column pdma_responded_at timestamptz,
  add column pdma_responded_by uuid references auth.users(id);

-- No browser column grant can write officer actions. The RPC is the only path.
revoke insert (pdma_review_started_at, pdma_review_started_by, pdma_response_note,
  pdma_responded_at, pdma_responded_by) on public.complaints from public, anon, authenticated;
revoke update (pdma_review_started_at, pdma_review_started_by, pdma_response_note,
  pdma_responded_at, pdma_responded_by) on public.complaints from public, anon, authenticated;

create function public.agriwatch_pdma_review_report_v1(report_id uuid, action text, note text default '')
returns public.complaints language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  actor uuid := public.agriwatch_complaints_web_uid_v1();
  report public.complaints;
begin
  select * into report from public.complaints where id = report_id for update;
  if not found or actor is null or report.pdma_assigned_at is null
      or report.pdma_assigned_to is distinct from actor then
    raise exception 'Authorized assigned PDMA reviewer required.' using errcode = '42501';
  end if;
  -- Lock the permission so revocation and officer action cannot race.
  perform 1 from public.agriwatch_pdma_report_permissions p
    where p.user_id = actor and p.district = report.district and p.active for share;
  if not found then
    raise exception 'Authorized assigned PDMA reviewer required.' using errcode = '42501';
  end if;
  if report.resolved_at is not null or report.status = 'Resolved' then
    raise exception 'Report is already resolved.';
  end if;
  if action = 'start_review' then
    update public.complaints set
      pdma_review_started_at = case
        when pdma_review_started_by = actor and pdma_review_started_at >= pdma_assigned_at
          then pdma_review_started_at else now() end,
      pdma_review_started_by = actor,
      updated_at = now() where id = report_id;
  elsif action in ('respond', 'resolve') then
    if report.pdma_review_started_by is distinct from actor
        or report.pdma_review_started_at < report.pdma_assigned_at then
      raise exception 'Start PDMA review for the current assignment first.';
    end if;
    if note is null or length(btrim(note)) = 0 or length(note) > 5000 then
      raise exception 'A PDMA response of 1 to 5000 characters is required.';
    end if;
    update public.complaints set
      pdma_response_note = btrim(note), pdma_responded_at = now(), pdma_responded_by = actor,
      status = case when action = 'resolve' then 'Resolved' else status end,
      resolved_at = case when action = 'resolve' then now() else resolved_at end,
      resolved_by = case when action = 'resolve' then actor else resolved_by end,
      handled_by = actor::text, updated_at = now() where id = report_id;
  else
    raise exception 'PDMA action must be start_review, respond, or resolve.';
  end if;
  select * into report from public.complaints where id = report_id;
  return report;
end;
$function$;

revoke all on function public.agriwatch_pdma_review_report_v1(uuid,text,text) from public, anon;
grant execute on function public.agriwatch_pdma_review_report_v1(uuid,text,text) to authenticated;
commit;
