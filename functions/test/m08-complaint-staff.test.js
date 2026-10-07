'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(
  __dirname,
  '../../supabase/migrations/20261007_m08_shared_complaints.sql',
), 'utf8');

function section(start, end) {
  const from = migration.indexOf(start);
  assert.notEqual(from, -1, `Missing SQL section: ${start}`);
  const to = migration.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `Missing end of SQL section: ${end}`);
  return migration.slice(from, to);
}

test('self-approved PDMA signup cannot authorize another complaint read or update', () => {
  const ordinaryWebUser = {
    uid: '11111111-1111-4111-8111-111111111111',
    admin: false,
    signup: { role: 'pdma', status: 'approved' },
  };
  const otherComplaint = {
    user_id: '22222222-2222-4222-8222-222222222222',
    firebase_uid: null,
  };

  assert.equal(ordinaryWebUser.signup.status, 'approved');
  assert.equal(ordinaryWebUser.admin, false);
  assert.notEqual(ordinaryWebUser.uid, otherComplaint.user_id);

  const staff = section(
    'create function public.agriwatch_complaints_staff_v1()',
    '$function$;',
  );
  assert.match(staff, /public\.is_agriwatch_admin\(\s*public\.agriwatch_complaints_web_uid_v1\(\)/i);
  assert.match(staff, /when public\.agriwatch_complaints_web_uid_v1\(\) is null then false/i);
  assert.doesNotMatch(staff, /website_signup_requests|pdma_officers|status\s*=\s*'approved'/i);

  const read = section(
    'create policy "M08 complaint owner or staff read"',
    'create policy "M08 complaint owner insert"',
  );
  assert.match(read, /public\.agriwatch_complaints_staff_v1\(\)/i);
  assert.match(read, /user_id\s*=\s*public\.agriwatch_complaints_web_uid_v1\(\)/i);
  assert.doesNotMatch(read, /website_signup_requests/i);

  const update = section(
    'create policy "M08 complaint staff update"',
    'revoke all on table public.complaints',
  );
  assert.match(update, /using\s*\(public\.agriwatch_complaints_staff_v1\(\)\)/i);
  assert.match(update, /with check\s*\(public\.agriwatch_complaints_staff_v1\(\)\)/i);
  assert.doesNotMatch(update, /website_signup_requests|user_id\s*=|firebase_uid\s*=/i);
  assert.doesNotMatch(`${read}\n${update}`, /auth\.uid\(\)/i);
});

test('M08 preflights and replaces the three confirmed live policies in one transaction', () => {
  const preflight = section('do $$', 'alter table public.complaints add column firebase_uid');
  for (const [name, command] of [
    ['authenticated create complaint', 'a'],
    ['authenticated read complaints', 'r'],
    ['staff update complaints', 'w'],
  ]) {
    assert.match(preflight, new RegExp(`p\\.polname::text = '${name}' and p\\.polcmd = '${command}'`));
    assert.match(migration, new RegExp(`drop policy "${name}" on public\\.complaints;`));
  }
  assert.match(preflight, /p\.polroles <> array\[authenticated_oid\]/);
  assert.match(preflight, /pg_get_expr\(p\.polqual, p\.polrelid\) = 'true'/);
  assert.match(preflight, /position\('website_signup_requests' in update_qual\)/);
  assert.match(preflight, /user_id_not_null is distinct from false/);
  assert.match(preflight, /ref_default is not null/);
  assert.match(preflight, /status_default not in/);
  assert.match(migration, /^begin;[\s\S]*commit;\s*$/m);
  assert.match(migration, /grant select on table public\.complaints to authenticated;/);
  assert.match(migration, /grant update \(status, resolution_note, handled_by, updated_at\)/);
  assert.doesNotMatch(migration, /drop table public\.complaints|delete from public\.complaints/i);
});

test('mobile insert relies on nullable user_id and generated ref/status defaults', () => {
  const mobile = fs.readFileSync(path.join(
    __dirname,
    '../../lib/features/complaints/repositories/supabase_complaint_repository.dart',
  ), 'utf8');
  const insert = mobile.slice(mobile.indexOf('.insert({'), mobile.indexOf('})', mobile.indexOf('.insert({')));
  assert.match(insert, /'firebase_uid': owner/);
  assert.match(insert, /'crop_type': cropType\.trim\(\)/);
  assert.doesNotMatch(insert, /'user_id'|'ref'|'status'/);
  assert.match(migration, /alter table public\.complaints alter column ref set default/);
  assert.match(migration, /status_default not in \('''Under Review''::text', '''Under Review'''\)/);
});
