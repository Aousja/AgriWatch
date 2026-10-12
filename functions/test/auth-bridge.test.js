'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assignAuthenticatedBridgeClaim } = require('../auth-bridge');

test('creation trigger matches the existing second-generation deployment', () => {
  const trigger = require('../index').setAuthenticatedRoleOnUserCreated;
  assert.equal(trigger.__endpoint.platform, 'gcfv2');
  assert.equal(trigger.__endpoint.eventTrigger.eventType, 'google.firebase.auth.user.v2.created');
  assert.equal(require('firebase-functions/v2/identity').onUserCreated instanceof Function, true);
});

test('creation handler reads the current record and preserves application claims', async () => {
  let written;
  await assignAuthenticatedBridgeClaim({ data: { uid: 'disposable-user' } }, {
    getUser: async uid => {
      assert.equal(uid, 'disposable-user');
      return { customClaims: { agriwatch_role: 'pdma_officer', agriwatch_district: 'Tharparkar', legacy_flag: true } };
    },
    setCustomUserClaims: async (uid, claims) => { written = { uid, claims }; },
  });
  assert.deepEqual(written.claims, {
    role: 'authenticated', agriwatch_role: 'pdma_officer', agriwatch_district: 'Tharparkar', legacy_flag: true,
  });
});

test('duplicate creation event does not rewrite an already authenticated role', async () => {
  await assignAuthenticatedBridgeClaim({ data: { uid: 'disposable-user' } }, {
    getUser: async () => ({ customClaims: { role: 'authenticated', agriwatch_role: 'admin' } }),
    setCustomUserClaims: async () => { assert.fail('Unexpected claim rewrite'); },
  });
});

test('malformed creation events cannot select another user', async () => {
  await assert.rejects(assignAuthenticatedBridgeClaim({ data: {} }, {
    getUser: async () => { assert.fail('Unexpected identity lookup'); },
  }), /missing its user UID/);
});
