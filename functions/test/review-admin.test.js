'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyWebAdmin } = require('../access-request-approval');

const adminUid = '11111111-1111-4111-8111-111111111111';

test('accepts only a valid Supabase session with existing admin membership', async () => {
  const calls = [];
  const request = async (path, options) => {
    calls.push({ path, options });
    return path === '/auth/v1/user' ? { id: adminUid } : true;
  };

  assert.equal(await verifyWebAdmin('web-token', request), adminUid);
  assert.deepEqual(calls, [
    {
      path: '/auth/v1/user',
      options: { headers: { Authorization: 'Bearer web-token' } },
    },
    {
      path: '/rest/v1/rpc/agriwatch_review_web_admin_v1',
      options: {
        method: 'POST',
        body: JSON.stringify({ candidate_uid: adminUid }),
      },
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
      path === '/auth/v1/user' ? { id: adminUid, role: 'admin' } : false
    )),
    { code: 'forbidden', statusCode: 403 },
  );
});
