# AgriWatch

AgriWatch is a Flutter mobile app for agricultural and drought awareness in
Pakistan. It gives farmers and community members a place to check local alerts,
manage their profile, and report drought situations. The app supports English
and Urdu and runs on Android, iOS, and Flutter web.

The repository also contains Firebase Cloud Functions, Firestore rules, and
Supabase rollout scripts for the app and its companion Afaq web dashboard.

## Implementation and release status

Source code in this repository is not a record of what every installed app or
deployed service currently supports.

| Area | Implemented code | Deployment and verification status |
| --- | --- | --- |
| Mobile drought reports | Updated report labels, drought categories, and action-based tracking are in the current source. | These changes require a mobile release. Users with an older installed version may still see the original complaint flow and categories. |
| Access-request approval | A trusted Firebase Function and companion dashboard integration exist. | The complete approval and role-granting workflow has not passed its end-to-end test; it is not documented as a finished staff approval service. |
| PDMA review | M08 includes explicit assignment rules and area-scoped permission checks. | This is a controlled rollout. Verified PDMA permissions and a real report assignment have not been tested; active PDMA review is not confirmed. |

Firebase remains the mobile sign-in provider, Supabase stores shared reports,
and Firestore remains the default for profiles and access requests. The M08
database, web, and mobile changes require a coordinated rollout; committing the
code or SQL does not deploy them.

## What the app covers

- **Sign in and account access:** Google, email/password, and phone verification
  flows, plus linking sign-in methods to an existing account.
- **Profiles:** name, contact details, district, and application role. Profile
  and access-request storage can use Firestore or Supabase during the documented
  migration process.
- **Alerts:** an alerts area and local condition entry point.
- **Drought situation reports (updated source):** submit and track reports using the shared
  Supabase complaints table and CMP reference. New categories cover prolonged
  water shortages, observed community drought, incorrect or missing AgriWatch
  drought alerts, and other drought-related situations. Crop type is optional.
- **Bilingual interface:** English and Urdu language selection and persisted
  language preference.
- **Account settings:** view and update profile information, manage linked sign-in
  methods, change language, and sign out.

Routine crop questions belong in crop advice. The mobile app's crop-advisory
home tile is currently a placeholder; a working advice feature is available in
the companion web app.

## Main user workflows

### Farmer or community member — updated mobile flow

The following describes the updated source. Availability in an installed app
depends on its release version and the coordinated backend rollout.

1. Create an account or sign in with Google, email, or phone.
2. Complete a profile with a district and account role.
3. Open Alerts to view the alert area, or choose **Report Drought Situation**.
4. Select one of the four drought report categories, optionally choose a crop,
   describe what is happening, and submit the report.
5. Track the report by its CMP reference. Status changes appear when their
   corresponding action has been recorded.

The updated workflow sends new reports to the AgriWatch admin dashboard first.
Submission alone does not record that review has started, a report has been
assigned to PDMA, or a situation has been resolved. Tracking should show these
actions as completed only when they are actually stored.

### Access requests and staff review

Roles that require approval can submit and check an access request through the
existing workflow. The companion Afaq web dashboard and server-side Firebase
Function contain approval code, but the complete approval and role-granting
workflow still requires an end-to-end test. A website signup or role selection
by itself does not establish PDMA report access.

The M08 code is designed to let an authorized admin explicitly assign a serious
drought report for PDMA review. Independently verified PDMA users should see only
assigned reports within their permitted area. Permission provisioning and a real
assignment must be verified during the controlled rollout before describing this
as an active service. The mobile app contains report tracking; the companion web
portal contains the admin and PDMA review interfaces.

## Technology

- Flutter and Dart for the mobile and web client.
- Firebase Authentication for Google, email/password, and phone sign-in.
- Cloud Firestore for profile and access-request data until the corresponding
  Supabase switches are deliberately enabled.
- Firebase Storage for the existing Firestore-based complaint evidence path.
- Firebase Cloud Functions containing trusted account-role setup and
  access-request approval logic; complete role granting is awaiting end-to-end
  verification.
- Supabase Auth integration for Firebase tokens and the shared complaints
  database used by the mobile app and Afaq web dashboard.

Firebase remains the app's sign-in provider. Supabase complaints require the
Firebase-to-Supabase Auth bridge and the database policies to be configured.
The report-review SQL migrations in this checkout are rollout files; their
presence in Git does not mean they have been applied to a database.

## Project layout

```text
lib/
  core/                  App design, configuration, storage, Supabase bridge
  features/
    auth/                Sign-in, phone verification, linked methods
    alerts/              Alert screen
    complaints/          Report forms, tracking, models, repositories
    home/                Home screen and quick actions
    profile/             Profile, settings, access requests
    shell/               Authenticated app navigation
functions/               Trusted Firebase Cloud Functions and Node tests
supabase/migrations/     Reviewed database migrations and rollout changes
supabase/rollout/        Explicitly deferred, manual rollout scripts
test/                    Flutter tests
```

## Run locally

Install Flutter using the Dart SDK constraint in `pubspec.yaml`, install the
Android or iOS toolchain you plan to use, and configure the Firebase project for
your development build. Then fetch packages and start the app:

```powershell
flutter pub get
flutter run
```

A local Firebase configuration is required for authentication, profiles, and
access requests. The committed Firebase app configuration identifies the
existing project; use your own Firebase project configuration for a separate
deployment.

### Supabase report configuration

Pass the Supabase project URL and publishable key at build time:

```powershell
flutter pub get
flutter run --dart-define="SUPABASE_URL=https://YOUR_PROJECT.supabase.co" --dart-define="SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY"
```

The app also accepts `SUPABASE_ANON_KEY` as the publishable-key define. These
are client credentials; never place a Supabase service-role key or Firebase
Admin credential in the app.

The Supabase profile and access-request repositories remain opt-in through
`USE_SUPABASE_PROFILES` and `USE_SUPABASE_ACCESS_REQUESTS`; both default to
`false`, so Firestore remains active for those data paths. Drought report
tracking uses Supabase and requires the Firebase third-party Auth integration,
the shared complaints table, and compatible RLS policies.

## Database and security notes

- Use the read-only inspection script before a database rollout:
  `supabase/m08_inspect_read_only.sql`.
- The drought-report compatibility migration is
  `supabase/migrations/20261008_m08_drought_report_review.sql`. Apply it only
  as part of the documented database, web, and mobile rollout.
- Temporary compatibility for older report submissions is removed only by the
  manual script in `supabase/rollout/`, after the supported clients have been
  updated and the retirement gates in
  `supabase/M08_DROUGHT_REPORT_ROLLOUT.md` are met.
- PDMA report permissions must be provisioned only after independently
  verifying the person's identity and district authority. Signup rows do not
  grant complaint access.
- Never run migration 6 as part of the drought-report rollout. Never put service
  credentials in Flutter defines or the web client.

## Checks

Run the Flutter test suite and static analysis from the repository root:

```powershell
flutter test
flutter analyze
```

Run the Cloud Functions test suite from `functions/` with Node.js 22:

```powershell
npm test
```

## Companion web dashboard

The companion React application is maintained in the
[Afaq AgriWatch web repository](https://github.com/Afaq-Munir12/AgriWatch).
Its source contains admin report review and response interfaces, plus the M08
PDMA assignment and review interfaces. The PDMA workflow is subject to the
controlled rollout and verification described above. This Flutter repository
does not contain the web dashboard's UI.

## Contributing

Keep changes scoped to the affected module, preserve existing report records and
CMP references, and include relevant checks with pull requests. Database
migrations should describe the required rollout and access rules; do not execute
them against a live project as part of an app build.
