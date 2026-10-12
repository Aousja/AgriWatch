'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyWebAdmin } = require('../access-request-approval');

const adminUid = '11111111-1111-4111-8111-111111111111';

test('accepts only a valid Supabase session with existing admin membership', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return path === '/auth/v1/user' ? { id: adminUid } : [{ user_id: adminUid }];
  };

  assert.equal(await verifyWebAdmin('web-token', request), adminUid);
  assert.deepEqual(calls, [
    {
      path: '/auth/v1/user',
      options: { headers: { Authorization: 'Bearer web-token' } },
    },
    {
      path: `/rest/v1/admins?user_id=eq.${adminUid}&select=user_id&limit=1`,
      options: undefined,
    },
  ]);
});

test('rejects a missing Supabase session without querying admin membership', async () => {
  const calls = [];
  await assert.rejects(
    verifyWebAdmin('invalid-token', async (path) => {
      calls.push(path);
      return {};
    }),
    { code: 'unauthorized', statusCode: 401 },
  );
  assert.deepEqual(calls, ['/auth/v1/user']);
});

test('rejects a valid user absent from admins membership', async () => {
  await assert.rejects(
    verifyWebAdmin('web-token', async (path) => (
      path === '/auth/v1/user' ? { id: adminUid, role: 'admin' } : []
    )),
    { code: 'forbidden', statusCode: 403 },
  );
});
