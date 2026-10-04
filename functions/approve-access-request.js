'use strict';

const { getAuth } = require('firebase-admin/auth');
const {
  ApprovalWorkflowError,
  reviewAccessRequest,
} = require('./access-request-approval');

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server environment variable ${name}.`);
  return value.replace(/\/$/, '');
}

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing required server environment variable SUPABASE_SERVICE_ROLE_KEY.');
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

async function verifyWebAdmin(accessToken) {
  const user = await supabaseRequest('/auth/v1/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!user?.id) throw new ApprovalWorkflowError('Invalid Supabase session.', 'unauthorized', 401);

  const profiles = await supabaseRequest(
    `/rest/v1/user_profiles?id=eq.${encode(user.id)}&select=id,role&limit=1`,
  );
  if (!Array.isArray(profiles) || profiles[0]?.role !== 'admin') {
    throw new ApprovalWorkflowError('Supabase admin authorization required.', 'forbidden', 403);
  }
  return user.id;
}

function createStore() {
  const selectRequest = [
    'id', 'firebase_uid', 'name', 'role', 'district', 'phone', 'status',
    'organization_name', 'designation', 'reason', 'official_email',
  ].join(',');

  return {
    async getRequest(requestId) {
      const rows = await supabaseRequest(
        `/rest/v1/access_requests?id=eq.${encode(requestId)}&select=${selectRequest}&limit=1`,
      );
      return rows[0] || null;
    },

    async getProfile(firebaseUid) {
      const rows = await supabaseRequest(
        `/rest/v1/mobile_firebase_profiles?firebase_uid=eq.${encode(firebaseUid)}&select=*&limit=1`,
      );
      return rows[0] || null;
    },

    async getRun(requestId) {
      const rows = await supabaseRequest(
        `/rest/v1/access_request_approval_runs?request_id=eq.${encode(requestId)}&select=*&limit=1`,
      );
      return rows[0] || null;
    },

    async beginRun(run) {
      const existing = await this.getRun(run.requestId);
      await supabaseRequest('/rest/v1/access_request_approval_runs?on_conflict=request_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          request_id: run.requestId,
          firebase_uid: run.firebaseUid,
          requested_role: run.requestedRole,
          target_profile_role: run.targetProfileRole,
          state: 'processing',
          attempt_count: (existing?.attempt_count || 0) + 1,
          previous_profile_exists: run.previousProfileExists,
          previous_profile_role: run.previousProfileRole,
          previous_access_granted: run.previousAccessGranted ?? false,
          previous_claim_role: run.previousClaimRole,
          previous_claim_role_present: run.previousClaimRolePresent,
          approved_by: run.adminUid,
          started_at: new Date().toISOString(),
          last_error: null,
        }),
      });
    },

    async markRun(requestId, update) {
      const body = {};
      if (update.state) body.state = update.state;
      if (update.grantedAt) body.granted_at = update.grantedAt;
      if (update.lastError) body.last_error = update.lastError;
      await supabaseRequest(
        `/rest/v1/access_request_approval_runs?request_id=eq.${encode(requestId)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(body),
        },
      );
    },

    async setRequestStatus(requestId, status) {
      await supabaseRequest(`/rest/v1/access_requests?id=eq.${encode(requestId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status }),
      });
    },

    async upsertProfile(request) {
      await supabaseRequest('/rest/v1/mobile_firebase_profiles?on_conflict=firebase_uid', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          firebase_uid: request.firebase_uid,
          name: request.name,
          phone_number: request.phone,
          email: request.official_email,
          district: request.district,
          role: request.role,
          access_granted: request.access_granted,
        }),
      });
    },

    async restoreProfile(firebaseUid, profile) {
      await supabaseRequest(`/rest/v1/mobile_firebase_profiles?firebase_uid=eq.${encode(firebaseUid)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          role: profile.role,
          access_granted: profile.access_granted ?? false,
        }),
      });
    },

    async deleteProfile(firebaseUid) {
      await supabaseRequest(`/rest/v1/mobile_firebase_profiles?firebase_uid=eq.${encode(firebaseUid)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    },
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
  if (req.method !== 'POST') {
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

    const requestId = req.body?.requestId;
    const action = req.body?.action;
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      res.status(400).json({ error: 'invalid_request_id' });
      return;
    }

    const adminUid = await verifyWebAdmin(accessToken);
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
      message: error.message,
    });
  }
}

module.exports = { handleReviewRequest, verifyWebAdmin };
