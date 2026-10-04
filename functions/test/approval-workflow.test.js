'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  reviewAccessRequest,
} = require('../access-request-approval');

function fakeWorkflow({ failOnceAt } = {}) {
  const events = [];
  const request = {
    id: '11111111-1111-4111-8111-111111111111',
    firebase_uid: 'firebase-user-1',
    name: 'Amina Khan',
    phone: '03001234567',
    email: 'amina@example.com',
    district: 'Lahore',
    role: 'officer',
    status: 'pending',
  };
  let profile = { role: 'citizen', access_granted: false };
  let claims = { role: 'authenticated', legacy_flag: true };
  let failed = false;

  function maybeFail(point) {
    if (failOnceAt === point && !failed) {
      failed = true;
      throw new Error(`${point} failed`);
    }
  }

  const store = {
    request,
    getRequest: async () => request,
    getRun: async () => null,
    getProfile: async () => (profile ? { ...profile } : null),
    beginRun: async (run) => events.push(['begin', run]),
    markRun: async (id, update) => events.push(['run', id, update]),
    setRequestStatus: async (_id, status) => {
      maybeFail('status');
      request.status = status;
      events.push(['status', status]);
    },
    upsertProfile: async (next) => {
      maybeFail('profile');
      profile = { role: next.role, access_granted: next.access_granted };
      events.push(['profile', { ...profile }]);
    },
    restoreProfile: async (_uid, previous) => {
      profile = { ...previous };
      events.push(['profile-restore', { ...profile }]);
    },
    deleteProfile: async () => {
      profile = null;
      events.push(['profile-delete']);
    },
  };

  const firebaseAuth = {
    getClaims: async () => ({ ...claims }),
    setClaims: async (_uid, next) => {
      maybeFail('firebase');
      claims = { ...next };
      events.push(['firebase', { ...claims }]);
    },
  };

  return { request, events, store, firebaseAuth, getProfile: () => profile, getClaims: () => claims };
}

test('approves officer requests with the pdma_officer mapping', async () => {
  const fake = fakeWorkflow();

  const result = await reviewAccessRequest({
    action: 'approve',
    requestId: fake.request.id,
    adminUid: 'supabase-admin-1',
    store: fake.store,
    firebaseAuth: fake.firebaseAuth,
  });

  assert.equal(result.applicationRole, 'pdma_officer');
  assert.equal(fake.request.status, 'approved');
  assert.deepEqual(fake.getProfile(), {
    role: 'pdma_officer',
    access_granted: true,
  });
  assert.equal(fake.getClaims().role, 'authenticated');
  assert.equal(fake.getClaims().agriwatch_role, 'pdma_officer');
  assert.equal(fake.getClaims().legacy_flag, true);
});

test('approves NGO requests with the ngo mapping', async () => {
  const fake = fakeWorkflow();
  fake.request.role = 'ngo';

  const result = await reviewAccessRequest({
    action: 'approve',
    requestId: fake.request.id,
    adminUid: 'supabase-admin-1',
    store: fake.store,
    firebaseAuth: fake.firebaseAuth,
  });

  assert.equal(result.applicationRole, 'ngo');
  assert.equal(fake.getProfile().role, 'ngo');
  assert.equal(fake.getClaims().agriwatch_role, 'ngo');
});

for (const failurePoint of ['status', 'profile', 'firebase']) {
  test(`rolls back a ${failurePoint} failure without elevated access`, async () => {
    const fake = fakeWorkflow({ failOnceAt: failurePoint });

    await assert.rejects(
      reviewAccessRequest({
        action: 'approve',
        requestId: fake.request.id,
        adminUid: 'supabase-admin-1',
        store: fake.store,
        firebaseAuth: fake.firebaseAuth,
      }),
      /Approval failed/,
    );

    assert.equal(fake.request.status, 'pending');
    assert.deepEqual(fake.getProfile(), {
      role: 'citizen',
      access_granted: false,
    });
    assert.deepEqual(fake.getClaims(), {
      role: 'authenticated',
      legacy_flag: true,
    });
    assert.deepEqual(
      fake.events.at(-1),
      ['run', fake.request.id, {
        state: 'failed',
        lastError: `${failurePoint} failed`,
      }],
    );
  });
}

test('a compensated failure can be retried successfully', async () => {
  const fake = fakeWorkflow({ failOnceAt: 'firebase' });
  const input = {
    action: 'approve',
    requestId: fake.request.id,
    adminUid: 'supabase-admin-1',
    store: fake.store,
    firebaseAuth: fake.firebaseAuth,
  };

  await assert.rejects(reviewAccessRequest(input), /Approval failed/);
  const result = await reviewAccessRequest(input);

  assert.equal(result.applicationRole, 'pdma_officer');
  assert.equal(fake.request.status, 'approved');
  assert.equal(fake.getProfile().access_granted, true);
  assert.equal(fake.getClaims().agriwatch_role, 'pdma_officer');
});

test('rejects without changing Firebase claims or profile', async () => {
  const fake = fakeWorkflow();

  const result = await reviewAccessRequest({
    action: 'reject',
    requestId: fake.request.id,
    adminUid: 'supabase-admin-1',
    store: fake.store,
    firebaseAuth: fake.firebaseAuth,
  });

  assert.equal(result.status, 'rejected');
  assert.equal(fake.request.status, 'rejected');
  assert.deepEqual(fake.getProfile(), {
    role: 'citizen',
    access_granted: false,
  });
  assert.deepEqual(fake.getClaims(), {
    role: 'authenticated',
    legacy_flag: true,
  });
});
