'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, firestoreRequest } = require('../approve-access-request');

function database() {
  const rows = new Map();
  const ref = key => ({
    key,
    async get() { return { id: key.split('/').at(-1), exists: rows.has(key), data: () => rows.get(key) }; },
    async set(data, options) { rows.set(key, options?.merge ? { ...rows.get(key), ...data } : data); },
    async update(data) { if (!rows.has(key)) throw Error('Missing document'); rows.set(key, { ...rows.get(key), ...data }); },
    async delete() { rows.delete(key); },
  });
  return { rows, collection: name => ({ doc: id => ref(`${name}/${id}`) }),
    async runTransaction(callback) { await callback({ get: r => r.get(), set: (r,d) => r.set(d) }); } };
}

test('default Firestore requests are reviewed without migration-6 database objects', async () => {
  const db = database();
  db.rows.set('access_requests/request1', { uid: 'farmer1', requestedRole: 'officer', status: 'pending', district: 'Lahore' });
  const store = createStore(db, () => { throw Error('Unexpected Supabase write'); });
  const request = await store.getRequest('firestore:request1');
  assert.equal(request.firebase_uid, 'farmer1');
  await store.setRequestStatus(request.id, 'approved');
  assert.equal(db.rows.get('access_requests/request1').status, 'approved');
});

test('trusted profile grant preserves personal fields and rollback restores authority', async () => {
  const db = database();
  db.rows.set('user_profiles/user1', { uid: 'user1', name: 'Disposable farmer', district: 'Lahore', role: 'farmer' });
  const store = createStore(db);
  await store.upsertProfile({ firebase_uid: 'user1', role: 'pdma_officer', access_granted: true });
  assert.equal(db.rows.get('user_profiles/user1').name, 'Disposable farmer');
  assert.equal(db.rows.get('user_profiles/user1').accessGranted, true);
  await store.restoreProfile('user1', { role: 'farmer', accessGranted: false });
  assert.equal(db.rows.get('user_profiles/user1').role, 'farmer');
  assert.equal(db.rows.get('user_profiles/user1').accessGranted, false);
});

test('unfinished, recovery-required and completed reviews cannot be taken over', async () => {
  for (const state of ['processing', 'recovery_required', 'granted', 'rejected']) {
    const db = database();
    db.rows.set('trusted_access_review_runs/request1', { state });
    await assert.rejects(createStore(db).beginRun({ requestId: 'request1', firebaseUid: 'u', adminUid: 'a' }));
    assert.equal(db.rows.get('trusted_access_review_runs/request1').state, state);
  }
});

test('request mapping takes identity and requested role from the stored document', () => {
  const row = firestoreRequest({ exists: true, id: 'fixture', data: () => ({ uid: 'owner', requestedRole: 'officer', fullName: 'Fixture' }) });
  assert.equal(row.id, 'firestore:fixture');
  assert.equal(row.firebase_uid, 'owner');
  assert.equal(row.role, 'officer');
});
