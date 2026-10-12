# Authentication and drought reports: production review plan

Status: local implementation and automated verification completed; no production
deployment, migration, account approval, or data change performed by this task.
Aousja's pending request was not used as test data. Neither module is yet certified
100%: real SMS/device and deployed cross-service acceptance remain outstanding.

## Evidence and limits

- Flutter tests and analysis cover role interpretation, profile creation rules,
  report parsing, tracking, legacy records, and narrow-screen report widgets.
- Functions tests cover admin authorization, trusted approval, compensation,
  personal-profile preservation, district requirements, and review locking.
- Disposable PostgreSQL integration executes the actual report migrations and
  tests submission/CMP reference, a new database session, admin response/assignment,
  PDMA review/response/resolution, revocation/reassignment, and permission denials.
  JWT claims simulate PostgREST sessions; this does not verify live JWT signing.
- Web production build and report-contract tests pass. Lint reports warnings;
  no interactive browser acceptance was available in this environment.
- FastAPI dependency/route tests cover staff token and district checks using
  mocked identity services; real cloud token verification remains a rollout check.

## Proposed sequence — review before executing any step

1. Read-only preflight: record current deployments, database grants/policies,
   backups, and applied migrations. Verify Firebase Phone Auth configuration,
   Android signing fingerprints/app verification, web authorized domains, Firebase
   project configuration, and Supabase third-party Firebase integration. Confirm
   the deployed Auth trigger generation. Live inspection confirmed the existing
   second-generation `google.firebase.auth.user.v2.created` event. The reviewed
   candidate preserves that API/name/generation with SDK 7.4.0 or newer.
2. Prepare a preview web build with `reviewAccessRequest` configured and Supabase
   bearer sessions. Configure the endpoint's server environment and secret, then
   propose its exact Functions deployment command. Check authenticated GET lists
   mobile requests and non-admin access is denied, without approving a real request.
3. Coordinate switching admin review traffic to that endpoint with Firestore rule
   deployment and `20261009_trusted_access_request_status.sql`. Its status UPDATE
   revocation is deliberately incompatible with old browser-only approval writes;
   keep those writes out of the cutover. It leaves older app request creation and
   personal-profile updates intact. The ledger is server-only Firestore, not a
   migration-6 database table. Never apply `20261006_access_request_approval_workflow.sql`.
4. Confirm report baseline `20261007_m08_shared_complaints.sql` and compatibility
   expansion `20261008_m08_drought_report_review.sql` are already applied.
   Do not rerun migrations.
   If both are absent, review an atomic combined transaction so the baseline is
   never exposed without the legacy compatibility expansion. Preserve old insert
   defaults and historical categories. Do not run the M08 finalization script.
5. Review/apply `20261009_m08_pdma_report_actions.sql` only after its baseline and
   compatibility dependencies are verified. It adds separate PDMA review/response
   fields and a restricted RPC; assignment remains exclusively an admin action.
   Root and web copies must be identical. No PDMA signup row grants report access:
   an admin must explicitly verify district permissions and assign each report.
6. Release the preview-verified web candidate and a supported Flutter build with
   Firebase OTP and returning sessions enabled. Keep original farmer/admin flows.
   Supabase-profile opt-in builds need separate stored-profile compatibility checks;
   the default build uses Firestore profiles. Mobile does not log in through FastAPI.
7. Deploy FastAPI staff-write protection together with the web alert client's bearer
   header. Install `backend/requirements.txt` (including firebase-admin) and configure
   server-only Supabase credentials/Firebase Admin credentials. Only POST `/alerts`
   requires staff access; inspected public ML/read endpoints remain public.
8. Using dedicated approved test identities (never Aousja's request), execute the
   live acceptance matrix below. Record screenshots, references, and denial results
   before declaring either module 100% or using that claim in the presentation.

## Live acceptance matrix

| Module | Required evidence |
| --- | --- |
| Authentication | Real Firebase SMS OTP on a supported device/build; wrong OTP denied; sign-out removes access; app restart restores the same user/profile; protected APIs reject invalid tokens. |
| Trusted approval | Dedicated pending officer request reviewed by a verified admin; non-admin denied; approved token refresh shows `agriwatch_role: pdma_officer` while `role: authenticated` remains; personal fields retained; rejected request grants no authority. |
| Farmer reports | Submit each agreed category, receive CMP reference, restart app and recover the same stored report/reference; another farmer cannot read it. |
| Admin reports | Review/respond, explicitly assign a verified officer in the report district; unauthorized assignment denied. |
| PDMA reports | Assigned, explicitly permitted officer reviews/responds/resolves; wrong district, unassigned/signup-only users and revoked/reassigned officers denied; farmer sees response and resolution. |
| Compatibility | An older supported app still creates/reads its own report; legacy categories and references remain; live website's existing farmer/admin UI continues working. |

## Local commands and recovery

Run `flutter test`, `flutter analyze --no-pub`, `npm test` under `functions`, and
`npm run build` plus `node --test test/report-contract.test.mjs` under the web checkout.
For isolated PostgreSQL testing install `@electric-sql/pglite` with
`npm install --prefix .local/auth-report-tests --no-audit --no-fund @electric-sql/pglite`,
then run `node test/security/report_rls.integration.mjs`. Backend tests:
`python -m pytest backend/tests/test_auth_security.py -q` from this checkout.

Prepare previous app/web artifacts for rollback. Keep additive database columns
and legacy compatibility; do not drop data or restore insecure client status writes
as an automatic rollback. Failed approval reconciliation is an operator action.
All production commands, SQL, identity provisioning, backfills, and acceptance-test
writes must be shown to the user and approved before execution.
