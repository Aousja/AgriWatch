import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityService } from '../src/staged/identityService.js';
import { createFirebaseDataClient } from '../src/staged/dataClient.js';
import { profileMemberships, resolvePortal } from '../src/staged/roleRouting.js';
import { checkPhoneSite } from '../src/staged/phoneSite.js';
function setup(options = {}) {
  const calls = [];
  const user = { uid: 'phone-firebase-uid', isAnonymous: false, providerData: [{ providerId: 'phone' }], getIdTokenResult: async () => ({ claims: { role: options.claim || 'authenticated' } }) };
  const auth = { currentUser: options.signedOut ? null : user };
  const report = { id: 'report-uuid', ref: 'CMP-STAGED', firebase_uid: options.foreignReport ? 'other-uid' : user.uid };
  const chain = { select: () => chain, eq: (key, uid) => { calls.push(['filter', key, uid]); return chain; }, order: async () => ({ data: [report], error: null }) };
  const sdk = {
    GoogleAuthProvider: class { setCustomParameters() {} },
    linkWithPopup: async target => { calls.push(['link', target.uid]); if (options.collision) throw Object.assign(new Error('used'), { code: 'auth/credential-already-in-use' }); return { user: { ...user, uid: options.changedUid || user.uid } }; },
    RecaptchaVerifier: class { constructor(target, container, parameters) { calls.push(['recaptcha', parameters.size]); } clear() { calls.push(['clear']); } },
    signInWithPhoneNumber: async (target, phone) => { calls.push(['sms', phone]); if (options.smsFailure) throw new Error('sms-failed'); return { confirm: async code => { if (code === '000000') throw new Error('wrong-code'); auth.currentUser = user; return { user }; } }; },
    signOut: async () => { auth.currentUser = null; },
  };
  const service = createIdentityService({ auth, sdk, client: { from: table => { calls.push(['table', table]); return chain; } }, readProfile: async uid => { if (options.profileFailure) throw new Error('profile-read-failed'); if (options.changeDuringRead) auth.currentUser = { ...user, uid: 'other' }; return options.noProfile ? null : { uid, role: options.storedRole }; }, readRequests: async uid => options.requestFailure ? Promise.reject({ code: 'permission-denied' }) : [{ uid }], readMemberships: options.readMemberships, checkPhoneSite: options.checkPhoneSite, delay: async () => {} });
  return { service, auth, user, calls };
}
test('OTP uses invisible Firebase verifier, rejects wrong code, and retains Firebase identity', async () => {
  const { service, user, calls } = setup({ signedOut: true });
  await assert.rejects(service.sendOtp('03110000000', {}));
  await service.sendOtp('+923110000000', {});
  await assert.rejects(service.confirmOtp('000000'));
  assert.equal((await service.confirmOtp('123456')).uid, user.uid);
  assert.ok(calls.some(call => call[0] === 'recaptcha' && call[1] === 'invisible'));
});
test('Google linking requires an existing Firebase account', async () => {
  const { service, calls } = setup({ signedOut: true });
  await assert.rejects(service.linkGoogle(), /Sign in/);
  assert.equal(calls.length, 0);
});
test('Google collision does not switch, merge, or overwrite identities', async () => {
  const { service, auth, calls } = setup({ collision: true });
  await assert.rejects(service.linkGoogle(), { code: 'auth/credential-already-in-use' });
  assert.equal(auth.currentUser.uid, 'phone-firebase-uid');
  assert.deepEqual(calls, [['link', 'phone-firebase-uid']]);
});
test('successful link preserves UID; unexpected identity change is rejected', async () => {
  assert.equal((await setup().service.linkGoogle()).uid, 'phone-firebase-uid');
  await assert.rejects(setup({ changedUid: 'other' }).service.linkGoogle(), /identity changed/);
});
test('missing authenticated claim prevents all data reads', async () => {
  const { service, calls } = setup({ claim: 'missing' });
  await assert.rejects(service.snapshot(), /claim is missing/);
  assert.equal(calls.length, 0);
});
test('report lookup uses UID; history failure remains separate from report/profile success', async () => {
  const { service, calls } = setup({ requestFailure: true });
  const snapshot = await service.snapshot();
  assert.deepEqual(calls, [['table', 'complaints'], ['filter', 'firebase_uid', 'phone-firebase-uid']]);
  assert.equal(snapshot.reports.data[0].ref, 'CMP-STAGED');
  assert.equal(snapshot.profile.status, 'read');
  assert.deepEqual(snapshot.accessRequests, { status: 'error', code: 'permission-denied' });
});
test('foreign report is rejected and sign-out removes reads', async () => {
  const { service } = setup({ foreignReport: true });
  assert.equal((await service.snapshot()).reports.status, 'error');
  await service.signOut();
  await assert.rejects(service.snapshot(), /Sign in/);
});
test('failed SMS verifier is cleared for retry', async () => {
  const { service, calls } = setup({ signedOut: true, smsFailure: true });
  await assert.rejects(service.sendOtp('+923110000000', {}));
  assert.deepEqual(calls.map(call => call[0]), ['recaptcha', 'sms', 'clear']);
});
test('actual Supabase SDK sends the latest Firebase ID token, with no Supabase Auth session', async () => {
  let token = 'firebase-token-before-refresh';
  const received = [];
  const auth = { currentUser: { getIdToken: async force => { assert.equal(force, false); return token; } } };
  const client = createFirebaseDataClient({
    url: 'https://example.supabase.co', key: 'public-key', auth,
    fetch: async (url, options) => {
      received.push(new Headers(options.headers).get('authorization'));
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  await client.from('complaints').select('id');
  token = 'firebase-token-after-refresh';
  await client.from('complaints').select('id');
  auth.currentUser = null;
  await client.from('complaints').select('id');
  assert.deepEqual(received, ['Bearer firebase-token-before-refresh', 'Bearer firebase-token-after-refresh', 'Bearer public-key']);
  assert.throws(() => client.auth.getSession(), /accessToken/);
});

test('verified UID routes using stored Farmer role regardless of public pre-login hint', async () => {
  const { service, calls } = setup({ signedOut: true, storedRole: 'farmer' });
  await service.sendOtp('+923110000000', {});
  await service.confirmOtp('123456');
  const result = await service.resolveAccess('public');
  assert.equal(result.firebaseUid, 'phone-firebase-uid');
  assert.equal(result.storedProfileRole, 'farmer');
  assert.equal(result.status, 'portal');
  assert.equal(result.portal, 'farmer');
  assert.deepEqual(result.storedRoles, ['farmer']);
  assert.ok(calls.every(call => !['insert', 'update', 'upsert'].includes(call[0])));
});

test('stored citizen membership routes to General Public without a chooser', async () => {
  const result = await setup({ storedRole: 'citizen' }).service.resolveAccess('farmer');
  assert.equal(result.portal, 'public');
  assert.equal(result.status, 'portal');
});

test('only both stored memberships allow a chooser, with no selected default', async () => {
  const result = await setup({ readMemberships: async uid => [{ uid, role: 'farmer' }, { uid, role: 'citizen' }] }).service.resolveAccess();
  assert.equal(result.status, 'choice');
  assert.equal(result.portal, null);
  assert.deepEqual(result.storedRoles, ['farmer', 'public']);
  assert.equal(resolvePortal('u', [{ uid: 'u', role: 'farmer' }, { uid: 'u', role: 'farmer' }]).status, 'portal');
});

test('missing profile or personal membership shows setup without granting a role', async () => {
  for (const options of [{ noProfile: true }, { storedRole: undefined }, { storedRole: 'pdma_officer' }]) {
    const result = await setup(options).service.resolveAccess();
    assert.equal(result.status, 'setup');
    assert.deepEqual(result.storedRoles, []);
  }
  assert.deepEqual(profileMemberships('u', { uid: 'u', requestedRole: 'farmer' }), []);
});

test('failed reads, foreign ownership and changed identity never route or show setup', async () => {
  await assert.rejects(setup({ profileFailure: true }).service.resolveAccess(), /profile-read-failed/);
  await assert.rejects(setup({ readMemberships: async () => { throw new Error('membership-read-failed'); } }).service.resolveAccess(), /membership-read-failed/);
  await assert.rejects(setup({ changeDuringRead: true }).service.resolveAccess(), /account changed/);
  await assert.rejects(setup({ readMemberships: async () => [{ uid: 'other', role: 'farmer' }] }).service.resolveAccess(), /ownership mismatch/);
  assert.throws(() => profileMemberships('u', { uid: 'other', role: 'farmer' }), /ownership mismatch/);
  await assert.rejects(setup({ signedOut: true }).service.resolveAccess(), /Sign in/);
});

test('missing Firebase bridge claim stops role reads and does not grant membership', async () => {
  await assert.rejects(setup({ claim: 'missing' }).service.resolveAccess(), /claim is missing/);
});

test('staging domain preflight rejects missing hostname before CAPTCHA or SMS', async () => {
  const config = { projectId: 'example-project', messagingSenderId: '123', authDomain: 'example.firebaseapp.com' };
  const identity = { projectId: 'example-project', messagingSenderId: '123', projectNumber: '123', authProjectNumber: '123' };
  const check = () => checkPhoneSite({ hostname: 'preview.example.com', config, fetchConfig: async () => ({ ...identity, authorizedDomains: [config.authDomain] }) });
  const { service, calls } = setup({ signedOut: true, checkPhoneSite: check });
  await assert.rejects(service.sendOtp('+923110000000', {}), { code: 'auth/unauthorized-domain' });
  assert.deepEqual(calls, []);
  await checkPhoneSite({ hostname: 'preview.example.com', config, fetchConfig: async () => ({ ...identity, authorizedDomains: [config.authDomain, 'preview.example.com'] }) });
  for (const mismatch of [{ projectId: 'wrong' }, { projectId: '123' }, { messagingSenderId: 'example-project' }, { messagingSenderId: '456' }, { authProjectNumber: '456' }]) {
    await assert.rejects(checkPhoneSite({ hostname: 'preview.example.com', config, fetchConfig: async () => ({ ...identity, ...mismatch, authorizedDomains: [config.authDomain, 'preview.example.com'] }) }), /does not match/);
  }
});
