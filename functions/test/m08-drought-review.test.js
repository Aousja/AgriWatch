'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261008_m08_drought_report_review.sql'), 'utf8');
const finalize = fs.readFileSync(path.join(__dirname, '../../supabase/rollout/m08_finalize_drought_report_compatibility.sql'), 'utf8');

test('new choice enforcement is insert-only and never rewrites legacy categories', () => {
  assert.match(sql, /before insert on public\.complaints/);
  assert.doesNotMatch(sql, /before (?:insert or update|update) on public\.complaints/);
  assert.doesNotMatch(sql, /set\s+(?:category|ref)\s*=|delete from|drop table/i);
  for (const category of [
    'Prolonged water shortage affecting an area or multiple farms',
    'Observed drought conditions affecting a community',
    'Incorrect or missing AgriWatch drought alert',
    'Other drought-related situation',
  ]) assert.ok(sql.includes("'" + category + "'"));
});

test('PDMA authorization requires identity, explicit assignment, active district grant', () => {
  const helper = sql.slice(sql.indexOf('create function public.agriwatch_report_pdma_read_v1'), sql.indexOf('drop policy "M08 complaint owner or staff read"'));
  assert.match(helper, /assigned_at is not null/);
  assert.match(helper, /assigned_to = public\.agriwatch_complaints_web_uid_v1\(\)/);
  assert.match(helper, /p\.user_id = assigned_to and p\.district = area and p\.active/);
  assert.doesNotMatch(sql, /website_signup_requests|pdma_officers|access_requests/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete|all).*agriwatch_pdma_report_permissions/i);
});

test('temporary direct writes are restricted to trusted admins and legacy fields', () => {
  assert.match(sql, /revoke update on public\.complaints from public, anon, authenticated/);
  assert.match(sql, /revoke update \(%I\)/);
  assert.match(sql, /grant update \(status, resolution_note, handled_by, updated_at\)/);
  const update = sql.slice(sql.indexOf('create policy "M08 complaint staff update"'), sql.indexOf('-- INSERT-only validation'));
  assert.match(update, /using \(public\.agriwatch_complaints_staff_v1\(\)\)/);
  assert.match(update, /with check \(public\.agriwatch_complaints_staff_v1\(\)\)/);
  assert.doesNotMatch(update, /website_signup_requests|pdma_officers/);
});

test('new review actions remain protected by admin RPC checks and timestamps', () => {
  const rpc = sql.slice(sql.indexOf('create function public.agriwatch_review_report_v1'));
  assert.ok(rpc.indexOf('if not public.agriwatch_complaints_staff_v1()') < rpc.indexOf('for update'));
  assert.match(rpc, /review_started_at = coalesce\(review_started_at, now\(\)\)/);
  assert.match(rpc, /pdma_assigned_at = now\(\), pdma_assigned_by = actor/);
  assert.match(rpc, /resolved_at = case when action = 'resolve' then now\(\) else resolved_at end/);
  assert.match(rpc, /p\.user_id = assignee and p\.district = report\.district and p\.active for share/);
  assert.match(rpc, /revoke all on function public\.agriwatch_review_report_v1\(uuid,text,text,uuid,text\) from public, anon/);
});

test('compatibility allows only pending insertion statuses, never completed actions', () => {
  const policy = sql.slice(sql.indexOf('create policy "M08 drought report owner insert"'), sql.indexOf('-- Temporary compatibility'));
  assert.match(policy, /status in \('Submitted', 'Under Review'\)/);
  for (const column of ['review_started_at', 'review_started_by', 'admin_responded_at', 'pdma_assigned_at', 'pdma_assigned_to', 'pdma_assigned_by', 'pdma_assignment_reason', 'resolved_at', 'resolved_by']) {
    assert.ok(policy.includes(column + ' is null'));
  }
});

test('exact locked status preflight precedes atomic constraint extension', () => {
  assert.match(sql, /lock table public\.complaints in access exclusive mode;/);
  for (const check of [
    "conname = 'complaints_status_check'", "status_check.contype is distinct from 'c'",
    'status_check.convalidated is distinct from true', 'status_check.connoinherit is distinct from false',
    'status_check.conkey is distinct from array[status_attnum]::smallint[]',
    'status_check.definition is distinct from', "conname <> 'complaints_status_check'",
  ]) assert.ok(sql.includes(check), check);
  assert.ok(sql.includes("'CHECK ((status = ANY (ARRAY[''Under Review''::text, ''Forwarded''::text, ''Resolved''::text])))'"));
  const drop = sql.indexOf('alter table public.complaints drop constraint complaints_status_check;');
  assert.ok(drop > sql.indexOf('status_check.definition is distinct from'));
  assert.match(sql.slice(drop), /status in \('Under Review', 'Forwarded', 'Resolved', 'Submitted', 'Assigned for PDMA review'\)\s*\) not valid;\s*alter table public\.complaints validate constraint complaints_status_check;/);
  assert.match(sql, /^begin;[\s\S]*commit;\s*$/m);
});

test('known deployed categories remain accepted temporarily with unchanged labels', () => {
  const legacyBranch = sql.slice(sql.indexOf('if new.category in ('), sql.indexOf('if new.category is null'));
  for (const category of ['Pest infestation', 'Water shortage', 'Crop damage', 'Drought / weather', 'Other', 'Crop Failure', 'Irrigation Shortage', 'Livestock Loss', 'Water Shortage', 'Crop Damage', 'Well / Tubewell Dried Up', 'Relief Not Received']) {
    assert.ok(legacyBranch.includes("'" + category + "'"));
  }
  assert.match(legacyBranch, /then\s*return new;/);
  assert.match(sql, /grant insert \(status\) on public\.complaints to authenticated;/);
  assert.doesNotMatch(sql, /alter column status set default 'Submitted'/);
});

test('separate finalization removes all temporary paths without changing old rows', () => {
  assert.match(finalize, /alter column status set default 'Submitted'/);
  assert.match(finalize, /revoke insert \(status\) on public\.complaints from authenticated;/);
  assert.match(finalize, /drop policy "M08 complaint staff update"/);
  assert.match(finalize, /revoke update \(%I\)/);
  assert.match(finalize, /status = 'Submitted'/);
  assert.match(finalize, /'rollout_phase', 'strict'/);
  assert.doesNotMatch(finalize, /Pest infestation|Crop damage|Crop Failure|delete from|drop table|drop constraint|update public\.complaints/i);
  assert.doesNotMatch(finalize, /create policy[^;]*for update/);
  assert.match(finalize, /has_column_privilege\('authenticated', 'public\.complaints', c\.attname, 'UPDATE'\)/);
  assert.match(finalize, /^begin;[\s\S]*commit;\s*$/m);
});

test('actual SQL sources contain no literal Markdown escapes and retain exact JWT issuer', () => {
  for (const source of [sql, finalize]) {
    assert.equal(source.includes('\\'), false);
    assert.ok(source.includes("'https://securetoken.google.com/agriwatch-pakistan'"));
  }
});
