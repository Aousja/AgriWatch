'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp();

const AUTHENTICATED_ROLE_CLAIMS = {
  role: 'authenticated',
};

async function setRoleCustomClaim() {
  let nextPageToken;
  let processedUsers = 0;
  let sampleUid;

  do {
    const listUsersResult = await getAuth().listUsers(1000, nextPageToken);
    nextPageToken = listUsersResult.pageToken;

    for (const userRecord of listUsersResult.users) {
      const existingClaims = userRecord.customClaims ?? {};
      await getAuth().setCustomUserClaims(
        userRecord.uid,
        {
          ...existingClaims,
          ...AUTHENTICATED_ROLE_CLAIMS,
        },
      );
      sampleUid ??= userRecord.uid;
      processedUsers += 1;
    }
  } while (nextPageToken);

  if (sampleUid == null) {
    console.log('Backfill complete: no Firebase Auth users were found.');
    return;
  }

  // Read the claim back from Firebase after writing it. This makes the
  // one-time operation fail loudly if the verification does not pass.
  const sampleUser = await getAuth().getUser(sampleUid);
  const verifiedClaims = sampleUser.customClaims ?? {};
  if (verifiedClaims.role !== AUTHENTICATED_ROLE_CLAIMS.role) {
    throw new Error(
      `Claim verification failed for sample user ${sampleUid}.`,
    );
  }

  console.log(`Backfill complete: ${processedUsers} user(s) updated.`);
  console.log(
    `Verified sample user ${sampleUid}: ${JSON.stringify(verifiedClaims)}`,
  );
}

setRoleCustomClaim().catch((error) => {
  console.error('Authenticated-role backfill failed:', error);
  process.exitCode = 1;
});
