# Complaint tracking recovery — 12 October 2026

Phase 2 was stopped to investigate the currently installed Android app.
The app was inspected using its running FirebaseAuth.currentUser, not the
previously saved test UID. The same current account was observed before and
after the update; its loaded profile role was `citizen` and its existing report
was `CMP-E87FD7C73F90`.

## Exact failure and cause

The installed app's tracking Future completed with:

```text
StateError: Supabase is required for complaint tracking.
#0 SupabaseComplaintRepository.client
   lib/features/complaints/repositories/supabase_complaint_repository.dart:35
#1 SupabaseComplaintRepository.getComplaints
   lib/features/complaints/repositories/supabase_complaint_repository.dart:56
```

Its own diagnostic log reported:

```text
[SupabaseComplaint] list SELECT not sent:
Supabase is required for complaint tracking;
urlConfigured=false; publishableKeyConfigured=false; columns=*
```

Inspection of a backup of the installed APK independently confirmed that
neither original Supabase define value was present in its debug kernel.
The original `.local/flutter-defines.json` was present and its checksum
matched the private pre-Phase-1 baseline.

| Candidate failure | Evidence |
| --- | --- |
| Profile loading | Running profile Future succeeded with Citizen; home/profile data loaded. |
| Missing build configuration | Confirmed: both runtime values empty and original values absent from installed APK. |
| Firebase token refresh | Not the captured failure: configuration guard failed before the Supabase request/token callback. Same session worked after rebuild. |
| Report query | Never sent in failing path; actual list/detail requests succeeded after rebuild. |
| Response parsing | Never reached in failing path; updated app produced Complaint objects for list and details. |

The complaint repository, mapper, Supabase bridge, and Supabase configuration
source were byte-identical to the private pre-Phase-1 snapshot. No source
reversion was justified. This was an installed-build configuration regression.
The evidence identifies omitted defines, but does not identify which earlier
invocation installed the unconfigured APK.

## Smallest correction

Built existing source with the unchanged original configuration:

```powershell
flutter build apk --debug --no-pub --dart-define-from-file=.local/flutter-defines.json
```

Build passed. APK inspection verified both original define values were present
without printing them. Installed `build/app/outputs/flutter-apk/app-debug.apk`
using `adb install -r`; Android returned `Success`. No uninstall, app-data clear,
sign-out, or alternate-account login was performed. The existing VS Code launch
configuration already supplies the defines file and needed no edit.

No application/UI source, SQL/RLS, authentication settings, account records,
profiles, or reports were modified. Existing unrelated work was retained.
No automated tests were used as a substitute for phone acceptance.

## Phone acceptance

On the connected Redmi Note 9 Pro:

- Running Firebase currentUser remained the same after the update.
- Profile Future completed successfully with Citizen.
- Actual tracking Future completed successfully with one Complaint:
  `CMP-E87FD7C73F90`.
- Actual detail Future completed successfully with the same reference.
- The user opened the report and confirmed: “The list and CMP-E87FD7C73F90
  details both load.”
- A captured and visually inspected phone screenshot shows the details screen:
  Submitted, district Mandi Bahuaddin, category Incorrect or missing AgriWatch
  drought alert, crop Maize, existing description, and tracking timeline.

Private local evidence (no token values printed):
`.local/tracking-failure-capture.txt`, `.local/tracking-installed-apk.json`,
`.local/tracking-corrected-apk.json`, `.local/tracking-phone-verification.txt`,
and `.local/tracking-verified-details.png`. The original failing APK was backed
up as `.local/installed-agriwatch-tracking-regression.apk`.

Phase 2 remains stopped.
