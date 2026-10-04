'use strict';

const APPLICATION_ROLES = Object.freeze({
  officer: Object.freeze({
    profileRole: 'pdma_officer',
    claimRole: 'pdma_officer',
  }),
  ngo: Object.freeze({
    profileRole: 'ngo',
    claimRole: 'ngo',
  }),
});

class ApprovalWorkflowError extends Error {
  constructor(message, code = 'approval_failed', statusCode = 500) {
    super(message);
    this.name = 'ApprovalWorkflowError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function roleMapping(requestedRole) {
  return APPLICATION_ROLES[String(requestedRole || '').trim().toLowerCase()];
}

function requirePendingRequest(request, action) {
  if (!request) {
    throw new ApprovalWorkflowError('Access request was not found.', 'not_found', 404);
  }
  if (request.status !== 'pending') {
    throw new ApprovalWorkflowError(
      `Only pending requests can be ${action}d.`,
      'request_not_pending',
      409,
    );
  }
  if (typeof request.firebase_uid !== 'string' || request.firebase_uid.trim() === '') {
    throw new ApprovalWorkflowError(
      'The access request has no Firebase UID.',
      'missing_firebase_uid',
      422,
    );
  }
}

async function compensate({
  store,
  firebaseAuth,
  request,
  previousProfile,
  previousClaims,
  statusAttempted,
  profileAttempted,
  claimsAttempted,
}) {
  const errors = [];

  // Remove the application claim first so a failed attempt cannot keep a
  // Firebase-only elevated permission while the database returns to pending.
  if (claimsAttempted) {
    try {
      await firebaseAuth.setClaims(request.firebase_uid, previousClaims);
    } catch (error) {
      errors.push(new Error(`Firebase claim rollback failed: ${error.message}`));
    }
  }

  if (profileAttempted) {
    try {
      if (previousProfile) {
        await store.restoreProfile(request.firebase_uid, previousProfile);
      } else {
        await store.deleteProfile(request.firebase_uid);
      }
    } catch (error) {
      errors.push(new Error(`Profile rollback failed: ${error.message}`));
    }
  }

  if (statusAttempted) {
    try {
      await store.setRequestStatus(request.id, 'pending');
    } catch (error) {
      errors.push(new Error(`Request-status rollback failed: ${error.message}`));
    }
  }

  return errors;
}

async function reviewAccessRequest({
  action,
  requestId,
  adminUid,
  store,
  firebaseAuth,
}) {
  if (!['approve', 'reject'].includes(action)) {
    throw new ApprovalWorkflowError('Unsupported review action.', 'invalid_action', 400);
  }

  const request = await store.getRequest(requestId);
  const existingRun = await store.getRun(requestId);
  const requestedRole = String(request?.role || '').trim().toLowerCase();
  const resumableApproval = action === 'approve'
    && request?.status === 'approved'
    && existingRun
    && ['processing', 'failed', 'recovery_required'].includes(existingRun.state);

  if (!resumableApproval) requirePendingRequest(request, action);

  if (action === 'reject') {
    await store.beginRun({
      requestId: request.id,
      firebaseUid: request.firebase_uid,
      requestedRole,
      targetProfileRole: null,
      adminUid,
    });
    await store.setRequestStatus(request.id, 'rejected');
    await store.markRun(request.id, { state: 'rejected' });
    return { requestId: request.id, status: 'rejected' };
  }

  const mapping = roleMapping(requestedRole);
  if (!mapping) {
    throw new ApprovalWorkflowError(
      `No application role mapping exists for requested role '${request.role}'.`,
      'unsupported_role',
      422,
    );
  }

  const currentProfile = await store.getProfile(request.firebase_uid);
  const previousProfile = existingRun?.previous_profile_exists === false
    ? null
    : existingRun?.previous_profile_role !== undefined
        ? {
            ...(currentProfile || {}),
            role: existingRun.previous_profile_role || 'citizen',
            access_granted: existingRun.previous_access_granted ?? false,
          }
        : currentProfile;
  const currentClaims = await firebaseAuth.getClaims(request.firebase_uid);
  const previousClaims = { ...currentClaims };
  if (existingRun?.previous_claim_role_present === false) {
    delete previousClaims.agriwatch_role;
  } else if (existingRun?.previous_claim_role !== undefined) {
    previousClaims.agriwatch_role = existingRun.previous_claim_role;
  }
  const previousClaimRolePresent = Object.prototype.hasOwnProperty.call(
    currentClaims,
    'agriwatch_role',
  );
  await store.beginRun({
    requestId: request.id,
    firebaseUid: request.firebase_uid,
    requestedRole,
    targetProfileRole: mapping.profileRole,
    previousProfileExists: currentProfile != null,
    previousProfileRole: previousProfile?.role ?? null,
    previousAccessGranted: previousProfile?.access_granted ?? false,
    previousClaimRole: currentClaims.agriwatch_role ?? null,
    previousClaimRolePresent,
    adminUid,
  });

  let statusAttempted = false;
  let profileAttempted = false;
  let claimsAttempted = false;

  try {
    if (!resumableApproval) {
      statusAttempted = true;
      await store.setRequestStatus(request.id, 'approved');
    }

    profileAttempted = true;
    await store.upsertProfile({
      ...request,
      role: mapping.profileRole,
      access_granted: true,
    });

    claimsAttempted = true;
    await firebaseAuth.setClaims(request.firebase_uid, {
      ...previousClaims,
      role: 'authenticated',
      agriwatch_role: mapping.claimRole,
    });

    await store.markRun(request.id, {
      state: 'granted',
      grantedAt: new Date().toISOString(),
    });
    return {
      requestId: request.id,
      status: 'approved',
      applicationRole: mapping.profileRole,
    };
  } catch (error) {
    const rollbackErrors = await compensate({
      store,
      firebaseAuth,
      request,
      previousProfile,
      previousClaims,
      statusAttempted,
      profileAttempted,
      claimsAttempted,
    });

    await store.markRun(request.id, {
      state: rollbackErrors.length === 0 ? 'failed' : 'recovery_required',
      lastError: [error.message, ...rollbackErrors.map((item) => item.message)].join('; '),
    });

    if (rollbackErrors.length > 0) {
      throw new ApprovalWorkflowError(
        'Approval failed and requires server-side recovery.',
        'recovery_required',
        500,
      );
    }
    throw new ApprovalWorkflowError(
      'Approval failed; the request remains pending and no elevated role was retained.',
      'approval_failed',
      500,
    );
  }
}

module.exports = {
  APPLICATION_ROLES,
  ApprovalWorkflowError,
  reviewAccessRequest,
  roleMapping,
};
