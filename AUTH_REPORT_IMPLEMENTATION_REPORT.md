# Authentication and drought situation reports — implementation report

Date: 9 October 2026. Changes are local candidates, not deployed production results.

| Module | Implemented and locally verified | Remaining acceptance | Meets 100%? |
| --- | --- | --- | --- |
| Authentication | Firebase phone OTP replaces anonymous/six-digit development acceptance. Sign-out uses the central Auth service; returning sessions and profile loading are enabled. Trusted admin review grants the mapped application role, preserves `role: authenticated`, retains personal profile fields, and the app reads authority from refreshed claims. FastAPI staff writes have token/district guards. | Real SMS/device sign-in, sign-out/restart/profile checks; deployed approval and real refreshed-token checks; live API denials. | No — deployed acceptance pending. |
| Drought Report / Complaint Management | Agreed drought categories; CMP submission and reload; admin review/response/assignment; assigned district-authorized PDMA review/response/resolution. Actual disposable PostgreSQL tests pass ownership and authorization denials, revocation/reassignment, and older insert/category compatibility. Farmer tracking displays PDMA responses. Assignment remains admin-controlled. | Reviewed database/web rollout; real mobile restart and cross-platform farmer/admin/PDMA workflow; deployed negative-access and older-build checks. | No — deployed acceptance pending. |

Verification: 28 Flutter tests, 29 Functions tests, 4 web contract tests, 36
PostgreSQL assertions, and 11 FastAPI security tests pass. Flutter analysis is
checked separately; web build succeeds and source lint succeeds with warnings.
Identity services are mocked in unit tests; PostgreSQL sessions use fixture JWT
claims. A new database session proves durable report recovery, not a physical
device restart. No interactive browser/device end-to-end claim is made.

The backend candidate is in the separate Git checkout `backend/`, cloned from
the existing AgriWatch backend repository because no backend checkout was available
initially. It protects the existing POST `/alerts` route and adds no mobile login
connection. Production backend environment/deployment verification is still needed.

No production data was changed or deployment executed. Aousja's request was not
approved or used for tests. Migration 6 and the M08 finalization script were not
applied. New migrations are additive candidates and preserve legacy report data;
the status-permission cutover requires the coordinated review endpoint/web release.

Review [the rollout plan](AUTH_REPORT_ROLLOUT.md) before production actions.
[The revised scope](docs/AGREED_AUTH_REPORT_SCOPE.md) records the presentation's
agreed drought situation report criteria; the original scope PDF is preserved.

## Live staged checks started on 9 October 2026

The user subsequently authorized a staged rollout using disposable accounts.
No candidate function, website, rules or SQL has yet been deployed/applied.
Two labelled disposable Firebase email accounts were created. Both passed actual
new-user creation, automatically granted `role: authenticated`, returning email
sign-in with the same UID, and Supabase access with a refreshed Firebase token.
This does not certify phone OTP, physical app restart, or returning phone login.

Disposable report `CMP-1EB09F9584FC` was submitted and reloaded by its farmer.
Another real Firebase user received zero rows for that report and HTTP 403/42501
on admin review. Anonymous report read received HTTP 401. Existing reports and
Aousja's request were not modified. The disposable report remains for completing
the admin/PDMA workflow; its identity and credentials are in ignored local artifacts.

Read-only live preflight confirmed existing report baseline/access RPCs but missing
`pdma_review_started_at` and related PDMA action columns. The existing review
endpoint does not yet support GET (HTTP 405). Full admin/assigned-PDMA/resolved and
unassigned-PDMA live checks remain pending coordinated migration and endpoint rollout.

Diff review corrected the mistaken first-generation Auth conversion: installed
SDK 7.4.0 supports `onUserCreated`, and the live function uses second-generation
`google.firebase.auth.user.v2.created`. Candidate now preserves its name/generation;
new metadata and claim-preservation tests pass (33 Functions tests total).
Original dashboard report tables/cards/filters/modals were restored with the new
restricted review/assignment actions inside them. Updated web build/tests pass.

An Android test phone is connected and a candidate debug build is in progress.
No browser connection is available. A Firebase CLI login-list command unexpectedly
printed cached credentials; all subsequent CLI output is filtered. User requested
guided Firebase re-login and Supabase/Vercel setup one step at a time and explicitly
requires access verification before deployment. Deployment/migration steps are held.
Neither module is yet 100%.

## Rollout access verification

Firebase re-login completed and read-only function inventory access was verified.
Supabase's saved access token successfully accessed project
`gtbfmrefgwodphjurvdq` (`ACTIVE_HEALTHY`), which matches the Flutter configuration.
Read-only SQL, Auth configuration, API key reads (values hidden), and migration
history reads all passed. No migration or deployment was performed during these
checks. Vercel access is the next guided setup step. The candidate Android APK
has finished building; device OTP acceptance remains pending.
