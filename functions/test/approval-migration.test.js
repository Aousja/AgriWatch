'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(
  __dirname,
  '../../supabase/migrations/20261006_access_request_approval_workflow.sql',
), 'utf8');

test('browser status writes lose table and column grants, with an effective privilege check', () => {
  assert.match(migration, /revoke update on table public\.access_requests\s+from public, anon, authenticated;/i);
  assert.match(migration, /revoke update \(status\) on table public\.access_requests\s+from public, anon, authenticated;/i);
  for (const role of ['anon', 'authenticated']) {
    assert.match(migration, new RegExp(
      `has_column_privilege\\('${role}', 'public\\.access_requests', 'status', 'UPDATE'\\)`,
      'i',
    ));
  }
  assert.match(migration, /grant update \(status\) on table public\.access_requests to service_role;/i);
  assert.match(migration, /has_column_privilege\('service_role', 'public\.access_requests', 'status', 'UPDATE'\)/i);
});

test('review RPC delegates to the existing membership function and is service-only', () => {
  assert.match(migration, /public\.is_agriwatch_admin\(candidate_uid\)/i);
  assert.match(migration, /revoke all on function public\.agriwatch_review_web_admin_v1\(uuid\)\s+from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.agriwatch_review_web_admin_v1\(uuid\)\s+to service_role;/i);
  assert.match(migration, /has_function_privilege\('authenticated', 'public\.agriwatch_review_web_admin_v1\(uuid\)', 'EXECUTE'\)/i);
});
