'use strict';

const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { defineSecret } = require('firebase-functions/params');
const {
  ApprovalWorkflowError,
  reviewAccessRequest,
  verifyWebAdmin,
} = require('./access-request-approval');

const supabaseServiceRoleKey = defineSecret('SUPABASE_SERVICE_ROLE_KEY');

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server environment variable ${name}.`);
  return value.replace(/\/$/, '');
}

function serviceHeaders() {
  const key = supabaseServiceRoleKey.value();
  if (!key) throw new Error('Missing Firebase Functions secret SUPABASE_SERVICE_ROLE_KEY.');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${requiredEnvironment('SUPABASE_URL')}${path}`, {
    ...options,
    headers: { ...serviceHeaders(), ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_) {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${body?.message || body}`);
  }
  return body;
}

function encode(value) {
  return encodeURIComponent(value);
}

function firestoreRequest(snapshot) {
  if (!snapshot.exists) return null;
  const row = snapshot.data();
  return { ...row, id: `firestore:${snapshot.id}`, firebase_uid: row.uid,
    name: row.fullName, role: row.requestedRole, official_email: row.officialEmail,
    organization_name: row.organizationName,
    submitted_at: row.submittedAt?.toDate?.().toISOString() || null };
}

function createStore(db = getFirestore(), request = supabaseRequest) {
  const runRef = id => db.collection('trusted_access_review_runs').doc(id.replace(':', '_'));
  const isFirestore = id => id.startsWith('firestore:');
  const requestRef = id => db.collection('access_requests').doc(id.slice('firestore:'.length));
  return {
    async getRequest(id) {
      if (isFirestore(id)) return firestoreRequest(await requestRef(id).get());
      const rows = await request(`/rest/v1/access_requests?id=eq.${encode(id)}&select=*&limit=1`);
      return rows[0] || null;
    },
    async getProfile(uid) {
      const row = await db.collection('user_profiles').doc(uid).get();
      return row.exists ? row.data() : null;
    },
    async getRun(id) {
      const row = await runRef(id).get();
      return row.exists ? row.data() : null;
    },
    async beginRun(run) {
      await db.runTransaction(async tx => {
        const ref = runRef(run.requestId);
        const prior = await tx.get(ref);
        const state = prior.data();
        if (['processing', 'recovery_required'].includes(state?.state)) {
          throw new ApprovalWorkflowError('Interrupted approval requires operator reconciliation.', 'recovery_required', 409);
        }
        if (['granted', 'rejected'].includes(state?.state)) {
          throw new ApprovalWorkflowError('Request already reviewed.', 'request_not_pending', 409);
        }
        tx.set(ref, {
          request_id: run.requestId, firebase_uid: run.firebaseUid,
          state: 'processing', approved_by: run.adminUid,
          attempt_count: (state?.attempt_count || 0) + 1,
          previous_profile_exists: run.previousProfileExists ?? false,
          previous_profile_role: run.previousProfileRole ?? null,
          previous_access_granted: run.previousAccessGranted ?? false,
          previous_claim_role: run.previousClaimRole ?? null,
          previous_claim_role_present: run.previousClaimRolePresent ?? false,
          started_at: new Date().toISOString(), last_error: null,
        });
      });
    },
    async markRun(id, update) {
      await runRef(id).update({ state: update.state,
        ...(update.grantedAt ? { granted_at: update.grantedAt } : {}),
        ...(update.lastError ? { last_error: update.lastError } : {}) });
    },
    async setRequestStatus(id, status) {
      if (isFirestore(id)) await requestRef(id).update({ status });
      else await request(`/rest/v1/access_requests?id=eq.${encode(id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status }) });
    },
    async upsertProfile(row) {
      await db.collection('user_profiles').doc(row.firebase_uid).set({
        uid: row.firebase_uid, role: row.role, accessGranted: row.access_granted,
      }, { merge: true });
    },
    async restoreProfile(uid, profile) {
      await db.collection('user_profiles').doc(uid).set({
        role: profile.role || 'citizen', accessGranted: profile.accessGranted ?? profile.access_granted ?? false,
      }, { merge: true });
    },
    async deleteProfile(uid) { await db.collection('user_profiles').doc(uid).delete(); },
  };
}

function createFirebaseAuthAdapter() {
  const auth = getAuth();
  return {
    async getClaims(firebaseUid) {
      const user = await auth.getUser(firebaseUid);
      return { ...(user.customClaims || {}) };
    },
    async setClaims(firebaseUid, claims) {
      await auth.setCustomUserClaims(firebaseUid, claims);
    },
  };
}

async function handleReviewRequest(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const bearer = req.get('authorization') || '';
    const accessToken = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '';
    if (!accessToken) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const adminUid = await verifyWebAdmin(accessToken, supabaseRequest);
    if (req.method === 'GET') {
      const rows = await getFirestore().collection('access_requests').orderBy('submittedAt', 'desc').limit(200).get();
      res.status(200).json({ requests: rows.docs.map(firestoreRequest) });
      return;
    }
    const requestId = req.body?.requestId;
    const action = req.body?.action;
    if (typeof requestId !== 'string' || !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|firestore:[A-Za-z0-9_-]{1,128})$/i.test(requestId)) {
      res.status(400).json({ error: 'invalid_request_id' });
      return;
    }

    const result = await reviewAccessRequest({
      action,
      requestId,
      adminUid,
      store: createStore(),
      firebaseAuth: createFirebaseAuthAdapter(),
    });
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error instanceof ApprovalWorkflowError ? error.statusCode : 500;
    res.status(statusCode).json({
      error: error.code || 'approval_failed',
      message: error instanceof ApprovalWorkflowError ? error.message : 'Review service failed. No successful approval is confirmed.',
    });
  }
}

module.exports = { createStore, firestoreRequest, handleReviewRequest, supabaseServiceRoleKey };
