# Authentication bridge and trusted request review

`setAuthenticatedRoleOnUserCreated` uses the supported **second-generation**
Firebase Auth creation trigger. It preserves other claims and sets the
Supabase integration claim `role: authenticated`. Application authority is
separate: `agriwatch_role`, and for approved officers `agriwatch_district`.
The installed firebase-functions 7.4.0 SDK and live inventory both use
`google.firebase.auth.user.v2.created`; preserve this function name and generation.

`reviewAccessRequest` accepts a Supabase bearer session. It verifies the
session through `/auth/v1/user`, then checks server-side `admins.user_id`
membership. Browser metadata and submitted roles never establish authority.
GET returns up to 200 recent Firestore mobile requests. POST accepts only
`requestId` and `action` (`approve` or `reject`). IDs are Supabase UUIDs or
`firestore:<document-id>`; the target Firebase UID and role come from storage.

Approval maps officer to `pdma_officer`, NGO to `ngo`, preserves the bridge
claim, and updates the default mobile Firestore profile without overwriting
personal fields. An officer district is mandatory; the reviewing admin must
verify it before approving. Supabase-profile builds display authority from
refreshed claims; this endpoint does not synchronize their stored profile row.

The server-only Firestore collection `trusted_access_review_runs` serializes
reviews. Failed approval attempts compensate profile, claims, and request
status. Interrupted `processing` and `recovery_required` records block retry
until an operator reconciles them. Reconcile Auth claims, profile, request,
and ledger together; do not clear a lock simply to force another approval.
Client Firestore rules permit neither request-status updates nor ledger access.

Required server configuration: `SUPABASE_URL`, Firebase Admin credentials,
and the Functions secret `SUPABASE_SERVICE_ROLE_KEY`, bound only to the review
endpoint. Keep the service credential out of mobile/web builds and Git.
Flutter needs its Firebase configuration, Supabase URL/publishable key, and
Supabase's third-party Firebase integration for `agriwatch-pakistan`.
The build keeps Firestore profiles and Firebase-to-Supabase reports.

Local verification: `npm test` in this directory. See
[the production review plan](../AUTH_REPORT_ROLLOUT.md) before any deployment.
**Do not apply migration 6 or the M08 finalization script.** The new standalone
status-permission migration does not depend on migration 6. Existing-user claim
backfill is a production write requiring separate review; do not run it as a test.
