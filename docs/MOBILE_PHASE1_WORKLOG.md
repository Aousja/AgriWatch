# Mobile Phase 1

## Starting checkout

- Branch: `main`.
- Commit: `c9a1d16e6dcc66b32071a9e4a5f83cc3904ba95f`.
- The working tree already contained modified mobile, Firebase Functions,
  Firestore rules, test, and configuration files, plus untracked documentation,
  staging, linking, and SQL files. They were retained; no checkout/reset/clean
  was used.
- Exact starting `git status --short`, configuration names, and configuration
  checksum are recorded privately in `.local/phase1-baseline/checkout.json`.
  Starting `lib/` and `test/` files were copied to that private baseline before edits.
- No separately attached mobile workflow audit was available in the workspace.
  Implementation followed the user's Phase 1 requirements and current source;
  a separate attachment has not been reviewed.

## Build configuration names (values withheld)

The existing `.local/flutter-defines.json` contains `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`. Both were present and the file was left unchanged.
The accepted key alias is `SUPABASE_ANON_KEY`.

The app also recognizes `USE_SUPABASE_PROFILES` and
`USE_SUPABASE_ACCESS_REQUESTS` (both retain their default `false`), plus
`IDENTITY_LINK_API_URL` (retains its existing unset/empty configuration).
Firebase configuration remains in `lib/firebase_options.dart` and
`android/app/google-services.json`.

Local build command uses the same file rather than reconstructing values:

```powershell
flutter build apk --debug --no-pub --dart-define-from-file=.local/flutter-defines.json
```

## Implemented scope

- Profile read failure is a retry state. Firestore profile reads require the
  server, so an offline cache miss cannot route a returning account to setup.
  The shell blocks unavailable profile data while keeping tab state mounted.
- Setup checks for an existing profile again. Firestore creation uses an
  existence-checking transaction and never overwrites a recovered profile on retry.
- The existing profile edit entry points open a form for name, district,
  contact phone/email, and photo URL. Only changed, already permitted fields
  are written. Firebase identity, providers, role, claims, and access status
  are unchanged. Failure retains values; success returns the updated profile.
- A missing report district has an explicit edit route back to the same draft.
- Submission retains the existing Supabase report contract and CMP reference.
  A pending submission blocks repeated taps and back navigation. Failure retains
  the draft. Confirmation opens details and back returns to refreshed tracking.
- Status filtering, case-insensitive CMP/topic search, clearing search/filters,
  refresh, pull-to-refresh, history cards, details, and back navigation work.
- Loading, read error/retry, true empty, no-match, and success states are distinct.
- Affected profile/report/alert text supports English/Urdu and Urdu direction.
  Stored categories, statuses, references, descriptions, and reviewer responses
  are retained; translations apply to display copy.
- Disconnected live alerts, mobile advice, support, and notification controls
  have honest unavailable states. No service contacts or recommendations were invented.
- Changing language from account settings returns to the current session.

Next-phase contracts and missing deployment information are recorded in
[MOBILE_PHASE1_API_INSPECTION.md](MOBILE_PHASE1_API_INSPECTION.md).

## Verification

Final command outcomes, changed-file inventory, APK location, and limitations
are recorded below after verification completes. No live report/profile/access
request was submitted or modified, and nothing was deployed.

- Focused existing login/role, profile/access-request, report/CMP, and linking
  regression suite: **48 passed, 1 skipped**. Command:
  `flutter test --no-pub test/features/phase1_workflow_test.dart test/features/complaints/drought_report_test.dart test/features/profile test/features/auth test/core`.
- After the last report-return/profile-focus correction, all **12 affected-flow
  widget tests passed again**, including refresh only after returning from details.
- Final `flutter analyze --no-pub lib test`: **no issues found**.
- Changed-file `git diff --check`: **passed**.
- Private verification compared protected login/provider, role, bridge,
  linking, access-request, report mapper/repository, and configuration files
  to the starting files: **unchanged**.
- Supabase defines checksum: **unchanged**. APK inspection checks presence of
  the original `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` without printing values.
- Live existing-record integrity read: profile and `CMP-7A1E716B604A` read;
  list/detail matched and a second read preserved the report. Administrative
  credentials were used, so this is not a client RLS or device-login acceptance test.
- Submission/edit tests used local doubles. No live report or profile was
  submitted or edited, and no isolated bridge row was created for verification.

The Android build emits existing Kotlin/plugin migration warnings about future
Flutter compatibility. Android dependencies/build configuration were not changed
as part of Phase 1.

Final local debug build: **passed** using the unchanged defines file. Artifact:
`build/app/outputs/flutter-apk/app-debug.apk`. The final build started after all
application source changes were complete. It was not installed or deployed.

Smallest next step: verify the current Firebase account, recovered profile, and
existing CMP report read-only in this local build on a test device. Resolve the
saved-UID/current-account mismatch before claiming live-login acceptance. Provide
the separate workflow audit if it adds requirements beyond the explicit Phase 1 scope.

## Files changed in this task

The inventory compares bytes against the starting working files, including
the user's uncommitted changes, rather than comparing against an older commit.

```text
lib/main.dart
lib/core/design/workflow_copy.dart (new)
lib/core/services/local_storage_service.dart
lib/features/auth/auth_gate.dart
lib/features/shell/app_shell.dart
lib/features/home/home_screen.dart
lib/features/alerts/alerts_screen.dart
lib/features/language/language_screen.dart
lib/features/profile/services/user_profile_service.dart
lib/features/profile/widgets/profile_read_view.dart (new)
lib/features/profile/screens/profile_edit_screen.dart (new)
lib/features/profile/screens/profile_screen.dart
lib/features/profile/screens/profile_setup_screen.dart
lib/features/profile/screens/settings_screen.dart
lib/features/complaints/screens/complaints_screen.dart
lib/features/complaints/screens/submit_complaint_screen.dart
lib/features/complaints/screens/complaint_detail_screen.dart
lib/features/complaints/widgets/complaint_card.dart
lib/features/complaints/widgets/complaint_category_selector.dart
lib/features/complaints/widgets/complaint_status_badge.dart
lib/features/complaints/widgets/complaint_summary_card.dart
lib/features/complaints/widgets/complaint_timeline.dart
test/features/phase1_workflow_test.dart (new)
test/features/profile/profile_recovery_test.dart (new)
test/features/complaints/drought_report_test.dart
docs/MOBILE_PHASE1_WORKLOG.md (new)
docs/MOBILE_PHASE1_API_INSPECTION.md (new)
```

Private local verification helpers/artifacts are in `.local/`: starting
baseline, `phase1_workspace.py`, `phase1_inspect.py`, `phase1_format.py`,
`phase1_live_read.py`, `phase1_existing_records.cjs`, their result JSON files,
and the read-only advisory repository inspection clone. They are not app code
or deployment configuration. Credential values were not printed or copied into docs.

## Live-read limitations

An administrative read of the previously verified UID found its existing
Firestore profile (with district) and report `CMP-7A1E716B604A`. List/detail
matched and a second read preserved the report. No access-request row was
returned for that saved UID. This verifies record integrity only.

The phone's app process was not running, a client-session read could not
decode the persisted session, and the saved UID's Firebase Auth lookup
returned `auth/user-not-found`. Do not infer that another current account is
deleted or repaired from those observations. Current-account sign-in and
existing-report acceptance on a device remain unverified. No account was
created, linked, deleted, or assigned a role to work around this blocker.

The local APK was not installed on the connected phone. No deployment occurred.

## Subsequent tracking recovery — 12 October 2026

The installed phone build was found to lack both Supabase defines. Its exact
tracking failure was captured from the current signed-in account, and the
existing source was rebuilt with the unchanged original defines and installed
as an update. Current-account list and `CMP-E87FD7C73F90` details then loaded
on the phone, confirmed by the user and a captured details screen. This
supersedes the earlier device-verification limitation for those read paths.
See [MOBILE_TRACKING_REGRESSION.md](MOBILE_TRACKING_REGRESSION.md) for evidence.
No application source or backend records were changed; Phase 2 remains stopped.
