-- MANUAL FINALIZATION ONLY; intentionally outside migrations/.
-- Do not apply with expansion. Gates are in M08_DROUGHT_REPORT_ROLLOUT.md.
-- No existing category, reference, status, or report is rewritten.
begin;
lock table public.complaints in access exclusive mode;

do $$
declare
  status_attnum smallint;
  status_check record;
begin
  if to_regprocedure('public.agriwatch_review_report_v1(uuid,text,text,uuid,text)') is null
     or to_regprocedure('public.agriwatch_validate_new_drought_report_v1()') is null
     or (select count(*) from pg_policy where polrelid = 'public.complaints'::regclass) <> 3
     or not exists (select 1 from pg_policy where polrelid = 'public.complaints'::regclass
       and polname = 'M08 complaint owner admin or assigned PDMA read')
     or not exists (select 1 from pg_policy where polrelid = 'public.complaints'::regclass
       and polname = 'M08 drought report owner insert')
     or not exists (select 1 from pg_policy where polrelid = 'public.complaints'::regclass
       and polname = 'M08 complaint staff update') then
    raise exception 'Expected the M08 compatibility-phase schema and policies.';
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
       'CHECK ((status = ANY (ARRAY[''Under Review''::text, ''Forwarded''::text, ''Resolved''::text, ''Submitted''::text, ''Assigned for PDMA review''::text])))'
     or exists (select 1 from pg_constraint
       where conrelid = 'public.complaints'::regclass and contype = 'c'
         and status_attnum = any(conkey) and conname <> 'complaints_status_check') then
    raise exception 'Expected the validated five-value M08 status constraint; inspect before finalizing.';
  end if;
  if (select pg_get_expr(d.adbin, d.adrelid)
      from pg_attrdef d where d.adrelid = 'public.complaints'::regclass
        and d.adnum = status_attnum) is distinct from '''Under Review''::text' then
    raise exception 'Expected the compatibility Under Review default.';
  end if;
end $$;

-- Preserve all five constraint values: three are necessary for stored legacy rows.
alter table public.complaints alter column status set default 'Submitted';
revoke insert (status) on public.complaints from authenticated;
drop policy "M08 drought report owner insert" on public.complaints;
create policy "M08 drought report owner insert" on public.complaints
  for insert to authenticated with check (
    status = 'Submitted' and resolution_note is null and handled_by is null
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

create or replace function public.agriwatch_validate_new_drought_report_v1()
returns trigger language plpgsql set search_path = pg_catalog, public
as $function$
begin
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

drop policy "M08 complaint staff update" on public.complaints;
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

create or replace function public.agriwatch_report_access_v1()
returns jsonb language sql stable security definer set search_path = pg_catalog, public
as $function$
  select jsonb_build_object('rollout_phase', 'strict',
    'admin', public.agriwatch_complaints_staff_v1(),
    'districts', coalesce((select jsonb_agg(p.district order by p.district)
      from public.agriwatch_pdma_report_permissions p
      where p.user_id = public.agriwatch_complaints_web_uid_v1() and p.active), '[]'::jsonb));
$function$;

do $$
declare c record;
begin
  if has_table_privilege('authenticated', 'public.complaints', 'UPDATE')
     or has_column_privilege('authenticated', 'public.complaints', 'status', 'INSERT') then
    raise exception 'Temporary status INSERT or blanket UPDATE grant remains.';
  end if;
  for c in select attname from pg_attribute where attrelid = 'public.complaints'::regclass
    and attnum > 0 and not attisdropped
  loop
    if has_column_privilege('authenticated', 'public.complaints', c.attname, 'UPDATE') then
      raise exception 'Temporary complaint UPDATE grant remains on %.', c.attname;
    end if;
  end loop;
end $$;
commit;
