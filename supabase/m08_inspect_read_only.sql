-- READ ONLY: capture before a coordinated rollout; no migrations are executed.
select a.attname, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull,
  pg_get_expr(d.adbin, d.adrelid) as default_expression
from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
where a.attrelid = 'public.complaints'::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum;
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
  and tablename in ('complaints', 'agriwatch_pdma_report_permissions');
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'complaints';
select grantee, column_name, privilege_type from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'complaints';
select p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'agriwatch%report%'
  or p.proname in ('is_agriwatch_admin', 'agriwatch_complaints_staff_v1', 'agriwatch_complaints_web_uid_v1'));
select ref, category, status from public.complaints where ref = 'CMP-7A1E716B604A';
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.complaints'::regclass;
select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid = 'public.complaints'::regclass and not tgisinternal;
select category, count(*) from public.complaints group by category order by category;
