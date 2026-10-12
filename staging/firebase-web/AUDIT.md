# Firebase farmer/public sign-in staging audit

**Current retry status:** [STAGING_OTP_RETRY.md](STAGING_OTP_RETRY.md) records the
subsequent approved domain additions, corrected identifier checks and updated
preview. The original staging deployment below is retained as historical
evidence. Production aliases and the database remain unchanged.

Date: 10 October 2026. This is an isolated copy of the current local React web
source. No production deployment, migration, provider configuration update,
account merge, or admin/PDMA authentication change was performed. A separate
Vercel preview was deployed from the verified static staging build:
https://agri-watch-afe71g4sx-afaq-munirs-projects.vercel.app/staged-sign-in .
It reached READY with preview target (`target: null`). The production alias
`agri-watch-rho.vercel.app` still points to deployment
`dpl_HBPPne8MJx8eTqePLVRyjufDbXAj` before and after that preview deployment.
The preview hostname has not been added to Firebase's authorized domains.

The user's existing UI must remain unchanged. This task modified only the
isolated staging copy and local audit helpers; existing web/mobile UI files
were not edited. The additional page is a staging diagnostic route, not a
replacement for the established login/dashboard UI.

## Current authentication

The React login/signup implementation uses Supabase Auth phone OTP and Google
OAuth. Its session user ID is a Supabase Auth UUID. Registration/profile lookup
uses `website_signup_requests(user_id, role)`; complaint ownership uses
`complaints.user_id`. The old Firebase Google hook remains in the source, but
the current login imports the Supabase hook. The original package manifest did
not include Firebase as a dependency.

Flutter uses Firebase Auth in project `agriwatch-pakistan`: native
`verifyPhoneNumber` followed by `signInWithCredential`, and a force-refreshed ID
token after asynchronous assignment of `role: authenticated`. Google sign-in
and explicit credential linking exist as separate mobile operations. An ordinary
Google sign-in is not proof of linking to the phone UID.

The mobile Supabase bridge supplies the current Firebase ID token through the
SDK's `accessToken` callback. Reports are fetched from `complaints` using the
text `firebase_uid`, rather than UUID `auth.uid()`. Mobile profile and request
services default to Firestore unless their independent build flags are enabled.
The saved candidate build configuration uses both Firestore defaults.

## Read-only live findings

Supabase project `gtbfmrefgwodphjurvdq` has a Firebase third-party Auth integration
with issuer `https://securetoken.google.com/agriwatch-pakistan`. Live database
metadata confirms text `complaints.firebase_uid`, `mobile_firebase_profiles.firebase_uid`
and `access_requests.firebase_uid`. Report owner SELECT policies check the UID
against the Firebase JWT subject and require the configured issuer, audience,
and authenticated role. Legacy Supabase report ownership remains UUID-based.

A successful Firebase public project configuration read listed `localhost`,
`agriwatch-pakistan.firebaseapp.com`, `agriwatch-pakistan.web.app`, and
`agri-watch-rho.vercel.app` as authorized domains. Subsequent Google endpoint
reads were intermittently unavailable; no domains were added. The first live
local SMS attempt returned `auth/invalid-app-credential` before sign-in. Firebase's
current documentation explicitly excludes localhost as a hosted phone-auth
domain, despite its presence in the authorized-domain list. Localhost is suitable
for reviewing the preview, but real phone acceptance needs an authorized HTTPS
staging hostname. No shared-project domain allowlist change was made. Phone provider
availability, SMS delivery, normal reCAPTCHA challenge fallback, Android app
verification, and Google popup linking still require live acceptance.

Two schema gaps are separate from authentication: live
`mobile_firebase_profiles` lacks `access_granted`, although the optional Flutter
Supabase profile reader selects it; live complaints lack the proposed PDMA action
columns. Neither gap was changed. The preview uses Firestore profiles by default
and selects report rows without requiring those optional action columns.

## Staged implementation

`/staged-sign-in` loads only in an explicit `staging` build with
`VITE_STAGED_FIREBASE_AUTH=true`. The normal build excludes this entry path.
The staging route loads independently of the legacy session providers.

Phone authentication uses Firebase's `RecaptchaVerifier` with `size: invisible`
and `signInWithPhoneNumber`. Firebase can present its normal challenge UI; no
custom bypass, testing-disabled verification, or mock SMS acceptance is enabled.
Failed SMS attempts clear the verifier before retry. OTP confirmation forces a
fresh Firebase token and waits for the authenticated claim; a missing claim
stops data reads and does not backfill or modify accounts.

Google is offered only as `linkWithPopup` on the already signed-in Firebase user.
The UID is checked after linking. Provider collisions stop with an error. There
is no fallback Google sign-in, email/phone lookup, unlink/delete, Supabase Auth
session exchange, or legacy user update. Selecting Farmer/Public is a preview
choice; it grants no staff permissions or legacy portal approval.

The separate Supabase client uses `accessToken: currentUser.getIdToken(false)`.
It does not access an existing Supabase Auth session. Reports use the same
`firebase_uid` filter as mobile. Profile and access-request reads are independent
and use the mobile build's configured storage sources. A read failure is reported
separately from an empty result and from successful report access. The preview
does not submit reports or requests; create the disposable CMP report on mobile.

## Exact data mapping

No migration is needed for the default Firestore path: read the existing
`user_profiles/{Firebase UID}` document and query `access_requests` where
`uid == Firebase UID`. Firestore document IDs identify requests. Reading the
same UID does not manufacture missing documents or an access-request history.
An account that has never requested officer/organization access should have
zero requests; that alone does not prove history recovery.

If moving those stores to Supabase later, use the following explicit mapping.
This mapping is documented only; no copy or migration was executed.

| Source Firestore profile | Target `mobile_firebase_profiles` |
| --- | --- |
| Document ID / `uid` (must agree) | `firebase_uid` text primary key |
| `name` | `name` |
| `phoneNumber` (legacy `phone` only as display fallback) | `phone_number` |
| `email` | `email` |
| `photoUrl` | `photo_url` |
| `district` | `district` |
| `role` | `role`; personal roles only on client creation |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` as UTC timestamptz |
| `accessGranted` | No current target column; do not select nonexistent `access_granted`. Derive effective access from refreshed trusted Firebase application-role claims, or review a server-managed schema addition separately. |

Preserve personal fields and existing timestamps during any future server copy;
stop on conflicting target rows. The current table's role constraint excludes
`ngo`, so a trusted NGO profile cannot be copied into that table unchanged without
a separately reviewed compatibility change. Stored role/status is not sufficient
to grant staff access; use the trusted application-role claim and existing RLS.

| Source Firestore access request | Target `access_requests` |
| --- | --- |
| `uid` | `firebase_uid` text |
| `requestedRole` (`officer` / `ngo`) | `role` unchanged |
| `fullName` | `name` |
| `organizationName` | `organization_name` |
| `designation`, `phone`, `reason`, `status` | Same-named columns |
| `district` (officer), `operationalDistrict` (NGO) | `district` |
| `submittedAt` | `submitted_at` UTC timestamptz |
| `cnic`, `province`, `department` | Same-named columns |
| `employeeId`, `officialEmail` | `employee_id`, `official_email` |
| `organizationType`, `registrationNumber` | `organization_type`, `registration_number` |
| `operationalProvince`, `operationalDistrict` | `operational_province`, `operational_district` |
| Firestore request document ID | It is not a Supabase UUID. Preserve it in a future unique source-ID crosswalk, keyed by project/collection/document ID, pointing to the new `access_requests.id` UUID. No such source-ID column/crosswalk is present in the audited table. |

A future history migration must preserve every source document, including
approved/rejected entries and any review metadata, without collapsing requests
by phone, email, UID, or latest status. Review metadata without a matching target
column needs a reviewed audit table/crosswalk extension. Copying approved status
must not assign claims or grant authority. Existing trusted review workflows stay
unchanged.

Existing Supabase Auth web users and `website_signup_requests` do not automatically
appear through this Firebase flow. Linking the same Google account in Firebase
does not transfer its Supabase UUID, registrations, or `complaints.user_id` records.
Any future legacy association would need proof of control of both authenticated
accounts and an explicit, audited mapping `(Firebase issuer, Firebase UID) ->
Supabase user UUID`; it must preserve original ownership and enforce access in
reviewed server/RLS logic. Email/phone equality is not identity proof. No such
association is implemented by this staging task.

## Acceptance evidence

| Check | Status |
| --- | --- |
| Identity isolation, collision, claim, sign-out, token callback, and report contract tests | 13 passed locally; simulated Firebase |
| Actual Supabase SDK bearer callback/refresh behavior | Covered locally with captured HTTP headers; no live Firebase proof |
| Staging build / normal build / staged source lint | Passed locally; bundle-size warnings on legacy application |
| Real web SMS OTP / interactive challenge fallback | Failed local attempt: `auth/invalid-app-credential`; hosted-domain acceptance pending |
| Mobile SMS OTP and independently observed UID | Pending; device connected and phone profile visible, which alone does not certify OTP |
| Same mobile/web Firebase UID and exact CMP report ID/reference | Pending |
| Profile data recovery | Pending separately; Firestore UID read implemented |
| Access-request history recovery | Pending separately; Firestore UID query implemented |
| Google link retains phone UID and CMP access | Pending |

Earlier disposable email-account report tests are not phone OTP evidence.
The preview's download records web observations and explicitly leaves the
mobile/web OTP result pending. Production release remains held until live
acceptance passes. Do not use a real access request or approve staff for this test.
