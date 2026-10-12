'use strict';

async function assignAuthenticatedBridgeClaim(event, auth) {
  const uid = event?.data?.uid;
  if (!uid) throw new Error('Auth creation event is missing its user UID.');
  const record = await auth.getUser(uid);
  const claims = record.customClaims || {};
  // Avoid an unnecessary whole-claim rewrite on duplicate deliveries.
  if (claims.role === 'authenticated') return;
  await auth.setCustomUserClaims(uid, { ...claims, role: 'authenticated' });
}

module.exports = { assignAuthenticatedBridgeClaim };
