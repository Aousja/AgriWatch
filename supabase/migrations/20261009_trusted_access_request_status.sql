-- Standalone status protection for the trusted Firebase review endpoint.
-- No migration-6 RPC, profile constraint rewrite, or approval-run table required.
-- Deploy and verify the trusted endpoint and compatible web cards before applying.
begin;
do $$
begin
  if to_regclass('public.access_requests') is null or to_regclass('public.admins') is null then
    raise exception 'Inspect existing access request and admin tables first.';
  end if;
end $$;
revoke update on public.access_requests from public, anon, authenticated;
do $$
declare c record;
begin
  for c in select attname from pg_attribute where attrelid = 'public.access_requests'::regclass
    and attnum > 0 and not attisdropped
  loop
    execute format('revoke update (%I) on public.access_requests from public, anon, authenticated', c.attname);
  end loop;
end $$;
grant select, update on public.access_requests to service_role;
do $$
begin
  if has_column_privilege('authenticated', 'public.access_requests', 'status', 'UPDATE')
     or has_column_privilege('anon', 'public.access_requests', 'status', 'UPDATE') then
    raise exception 'A client still has status-write privilege; inspect inherited grants.';
  end if;
end $$;
commit;
