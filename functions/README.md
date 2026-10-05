# Firebase Auth ↔ Supabase bridge

This directory contains the additive Firebase-side foundation for the
Supabase third-party Firebase Auth integration. It does not read or modify
Firestore data.

## Deploy

For the existing Auth bridge, from the repository root after authenticating
the Firebase CLI:

```powershell
firebase deploy --only functions:setAuthenticatedRoleOnUserCreated --project agriwatch-pakistan
```

The bridge function `setAuthenticatedRoleOnUserCreated` uses Firebase's 2nd-gen
`onUserCreated` Auth trigger and sets exactly:

```js
{ role: 'authenticated' }
```

## One-time existing-user backfill

After the function is deployed, run:

```powershell
Push-Location functions
npm install
npm run backfill:authenticated-role
Pop-Location
```

The script pages through every Firebase Auth user, applies the same claim, and
reads one updated user back from the Admin SDK. It prints the processed count
and the verified sample user's UID/claims.

For local Admin SDK credentials, use the normal Firebase/Google Application
Default Credentials flow or set `GOOGLE_APPLICATION_CREDENTIALS` to a service
account JSON file outside the repository. Do not commit that file.

## Flutter build configuration

Pass the Supabase project URL and publishable (anon) key at build time:

```powershell
flutter run `
  --dart-define=SUPABASE_URL=https://<supabase-project-ref>.supabase.co `
  --dart-define=SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
```

The app's Supabase access-token callback returns the current Firebase ID token.
After sign-in/create-user calls, the bridge requests a forced Firebase token
refresh so the asynchronously assigned `role` claim can be used by Supabase.

The Supabase dashboard still needs a Third-party Auth integration registered
for Firebase project ID `agriwatch-pakistan`. No shared Supabase tables,
schemas, policies, or data are changed by this bridge foundation.

## Access-request review endpoint

`reviewAccessRequest` is a server-only endpoint for Afaq's web dashboard. The
browser sends only a request UUID and `approve`/`reject` action with its
Supabase Auth bearer token. The function verifies that token, then calls the
service-only `agriwatch_review_web_admin_v1` RPC. That RPC delegates to the
existing `is_agriwatch_admin(uuid)` membership rule backed by `admins`.

It never trusts a browser-supplied Firebase UID or requested role. Approval
maps `officer` to `pdma_officer` and `ngo` to `ngo`, preserves existing
Firebase custom claims, keeps Firebase's reserved `role: 'authenticated'`,
updates the server-managed mobile profile, and changes the request status only
through the trusted workflow. Partial failures are compensated back to a
pending request; unrecoverable compensation is marked `recovery_required`.

The deployed function requires these server-side values:

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY` as a Firebase Functions secret bound only to
  `reviewAccessRequest`

Set the credential with `firebase functions:secrets:set
SUPABASE_SERVICE_ROLE_KEY --project agriwatch-pakistan` during rollout. Store
`SUPABASE_URL` in the function's server environment. Never put the service-role
key in Flutter, the web bundle, `--dart-define`, or a tracked `.env` file.

## Approval rollout order

Confirm the existing `20261004_mobile_firebase_profiles.sql`,
`20261004_mobile_firebase_access_requests.sql`,
`20261005_mobile_firebase_access_requests_uuid_safe.sql`, and
`20261005_mobile_firebase_access_requests_uuid_safe_02_admin_policy.sql`
migrations are already in place. Do not rerun applied migrations. For the
approval cutover, use this order:

1. Prepare and verify the replacement dashboard with both Approve and Reject
   calling `reviewAccessRequest`. Keep the existing dashboard available.
2. Configure the server-side `SUPABASE_URL` and set the Firebase Functions
   secret `SUPABASE_SERVICE_ROLE_KEY`. Deploy with
   `firebase deploy --only functions:reviewAccessRequest --project agriwatch-pakistan`.
   Keep the existing dashboard available while the new RPC is absent.
3. Deploy the replacement dashboard alongside the existing one and verify its
   request list, session handling, and endpoint wiring without changing a
   request. Do not retire the existing dashboard yet.
4. Apply `20261006_access_request_approval_workflow.sql` in one transaction.
   It adds the approval-run table and admin RPC, then revokes both table-level
   and column-level browser UPDATE on `access_requests.status`. The endpoint
   can now process Approve and Reject through the service role.
5. Switch review traffic to the replacement dashboard, verify the live
   authorization and denial paths without changing a request, then retire
   the old dashboard after the replacement is healthy.
