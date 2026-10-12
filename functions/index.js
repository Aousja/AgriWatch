'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { onRequest } = require('firebase-functions/v2/https');
const { onUserCreated } = require('firebase-functions/v2/identity');
const { assignAuthenticatedBridgeClaim } = require('./auth-bridge');
const {
  handleReviewRequest,
  supabaseServiceRoleKey,
} = require('./approve-access-request');

initializeApp();

/**
 * Persist the Supabase-required role on every Firebase user created after
 * this function is deployed.
 *
 * Authentication event delivery is at-least-once, and setting the same
 * claim repeatedly is safe, so this handler is intentionally idempotent.
 */
exports.setAuthenticatedRoleOnUserCreated = onUserCreated(async (event) => {
  await assignAuthenticatedBridgeClaim(event, getAuth());
});

/**
 * Approves or rejects a shared access request after validating the Supabase
 * web-admin session. The browser supplies only requestId and action.
 */
exports.reviewAccessRequest = onRequest({
  cors: true,
  secrets: [supabaseServiceRoleKey],
}, handleReviewRequest);

// Stage independently; deploying this name does not replace the live endpoint.
exports.reviewAccessRequestStaging = onRequest({
  cors: true,
  secrets: [supabaseServiceRoleKey],
}, handleReviewRequest);
