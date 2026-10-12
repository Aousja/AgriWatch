# Farmer advisory integration — 12 October 2026

## Remote commits and local starting point

The current branch was `main`, at
`c9a1d16e6dcc66b32071a9e4a5f83cc3904ba95f`, with extensive uncommitted mobile,
Firebase Functions, rules, documentation, staging, and SQL work. That work was
preserved. No stash, reset, clean, whole-file replacement of modified mobile
workflows, commit, push, or deployment was used.

`git fetch origin` updated `origin/main` to
`be5e61043947d0521dc52b25f9a4e4bd3b61b332`. The remote advertises only `main`.
The incoming commits are:

| Commit | Subject | Git author |
| --- | --- | --- |
| `f0b84fde13a659555fcce5eaeb01bcfdc5fa72ca` | Add authenticated farmer advisory chat | Codex |
| `be5e61043947d0521dc52b25f9a4e4bd3b61b332` | Move advisory API files into chat folder | Codex |

Git author metadata does not establish who pushed a commit. After reviewing
the fetched source, the user confirmed this farmer advisory feature was the
intended feature. Feature files were integrated from the final `be5e610`
revision, including the functionality introduced by `f0b84fd`. The local branch
tip remains unchanged; the integration is in the working tree.

The exact net upstream file inventory is:

```text
android/app/src/main/AndroidManifest.xml
android/gradle.properties
ios/Runner/Info.plist
lib/chat/README.md
lib/chat/chat_api.dart
lib/features/advisory/advisory_hint_notification.dart
lib/features/advisory/advisory_screen.dart
lib/features/auth/auth_gate.dart
lib/features/home/home_screen.dart
lib/features/profile/screens/profile_setup_screen.dart
lib/features/shell/app_shell.dart
lib/main.dart
linux/flutter/generated_plugin_registrant.cc
linux/flutter/generated_plugins.cmake
macos/Flutter/GeneratedPluginRegistrant.swift
pubspec.lock
pubspec.yaml
test/features/advisory/chat_api_test.dart
windows/flutter/generated_plugin_registrant.cc
windows/flutter/generated_plugins.cmake
```

## Integration scope and files changed here

| Files | Change |
| --- | --- |
| `lib/chat/chat_api.dart` | Imported authenticated API client from `be5e610`. |
| `lib/features/advisory/advisory_screen.dart` | Imported text/photo/voice chat and conversation history screen. |
| `lib/chat/README.md` | Imported and corrected documentation to describe the actual Home entry rather than the deferred global button. |
| `lib/features/home/home_screen.dart` | Added advisory import and navigation to the existing farmer Crop advisory action; updated its English/Urdu subtitle. Existing layout and other actions retained. |
| `test/features/advisory/chat_api_test.dart` | Imported existing API/session refresh tests. |
| `pubspec.yaml`, `pubspec.lock` | Added direct HTTP, recorder, temporary file, and source-link dependencies and resolved native/transitive packages for the installed Flutter SDK. Only existing package version change against the local baseline is `url_launcher` 6.3.2 → 6.3.3. |
| `android/app/src/main/AndroidManifest.xml` | Added Internet and microphone permissions from upstream. |
| `ios/Runner/Info.plist` | Added camera, gallery, and microphone usage descriptions from upstream. |
| Linux, macOS, Windows generated plugin registrants/CMake files | Flutter regenerated native recorder/path-provider registration. |
| Android/iOS generated plugin registrants (ignored build support files) | Flutter regenerated native registration. |
| `docs/MOBILE_ADVISORY_INTEGRATION.md` | This integration and acceptance report. |

The overlap in Home was reconciled manually against the preserved working file.
Existing profile callbacks, language behavior, complaint routes, and Phase 1 UI
were retained. The upstream global floating support button, greeting overlay,
route notifications, and associated auth/setup/shell/main edits were deferred
for the later design review. The upstream Kotlin incremental setting was not
needed for the feature integration.

A private baseline in `.local/advisory-integration-baseline` records source
hashes, starting status, branch, commit, and original defines. Integrity checks
confirmed no unrelated existing source, backend, profile/auth/complaint workflow,
or original defines changed. No Supabase policy, Firebase setting, or production
record was changed.

## Data and farmer actions

The existing farmer Home **Crop advisory** action opens **Farmer advisory**.
The current Citizen account keeps its previous Home actions; its role was not
changed to exercise the farmer entry.

The client defaults to
`https://farmer-advisory-api-ashy.vercel.app/api/advisory`, optionally overridden
by `API_BASE_URL`. The original Supabase defines file was not edited. Requests
use the current Firebase user's ID token; there is no second sign-in. HTTP 401
causes one forced token refresh and retry.

| Farmer action | API/data path |
| --- | --- |
| Browse saved conversations | `GET /conversations` |
| Reopen saved messages | `GET /conversations/{id}/messages` |
| Start a question | `POST /conversations` when Send is first tapped |
| Ask about crops, soil, irrigation, pests, or drought | `POST /chat` with text and selected answer language |
| Attach a camera/gallery photo or voice question | `POST /attachments`, then its ID in `/chat`; one attachment, at most 4 MiB; recording stops after 59 seconds |
| Read supplied references | Source links returned with the API response/history |

Answers and history come from the remote advisory service, not the Supabase
complaints table or a bundled recommendation dataset. The previously inspected
backend source (`eng-ui/farmer-advisory-api`, `addc65d79fe9b11928d8d62636c9a3475f8f0730`)
uses a server-side Gemini provider, conversation history, and retrieved approved
knowledge documents. That source inspection does not prove the deployed model,
credentials, database configuration, or approved reference coverage. The public
health endpoint returned HTTP 200 with `status: ok` and service
`farmer-advisory-system` during this task.

This feature provides conversational advice. Structured crop ranking, crop
selection scoring, and a crop/district/area context form are not implemented.
Farmers can include those details in their question. The mobile screen currently
sends only the answer language when creating a conversation.

## Validation

- Advisory client plus existing profile/auth/complaint/linking suite:
  **50 passed, 1 existing skipped test**.
- `flutter analyze --no-pub lib test`: **no issues found**.
- Existing-file integrity comparison: **passed**, including original defines.
- Public advisory health: **HTTP 200**; no question, conversation, attachment,
  profile, or report was created during verification.
- Android debug APK: **built successfully**, using
  `flutter build apk --debug --no-pub --dart-define-from-file=.local/flutter-defines.json`.
  The successful native rebuild took 741.7 seconds.
- Candidate inspection: both original Supabase values were present without
  printing them, and the original defines file checksum remained unchanged.
- Installed using Android replace/update (`adb install -r`): **Success**.
  The preceding working tracking APK was backed up privately. Its SHA-256
  matched the APK delivered by the prior tracking recovery.
- Current Firebase account remained the same after the update; no old saved
  test UID was used.
- Phone startup: **passed**; the captured Home screen shows the recovered
  current profile and original Citizen actions.
- Actual running complaint list Future: **success**, one existing Complaint,
  `CMP-E87FD7C73F90`; the visible tracking list was also captured.
- User phone walkthrough: **passed**. The user confirmed:
  “App opens; report list and details both load.” The subsequent captures
  independently show the list and Home; this task's screenshot probe did not
  catch the details route before the user returned Home.
- Authenticated advisory-history probing could not obtain its read result
  through the debug VM; it did not establish either an API success or an API
  failure. Only public advisory health is verified live.

Private acceptance artifacts are `.local/advisory-apk.json`,
`.local/advisory-api-health.json`, `.local/advisory-phone-startup.txt`,
`.local/advisory-phone-details.txt`, `.local/tracking-advisory-startup.png`
(the report list), and `.local/tracking-advisory-details.png` (the Home screen
after the user returned). These names reflect capture requests; the actual
visible screen is stated here to avoid overstating the evidence.

The first APK attempt failed because `.dart_tool/package_config.json` was
missing at Gradle's Flutter compile step. Dependencies were regenerated with
`flutter pub get`, then the same original-defines build was retried. The cause
of the metadata disappearing was not established; app source was not changed
to address it.

## Incomplete work and UI findings

These advisory findings come from source review unless identified as phone
acceptance below:

- Live generated answers, camera/gallery upload, microphone capture, and
  persistence after Send are unverified. They write advisory production data,
  so no live send was performed under this task's read-only constraint.
- A farmer-account Home/advisory walkthrough remains unverified on the phone;
  the current account is Citizen, and its production role was preserved.
- Chat controls and empty/error copy are English-only. The language menu
  changes the requested answer language; it does not localize the chat UI.
- There is no structured crop/district/area input or automatic use of the
  farmer profile's district in a request.
- API `status`, interpreted voice text, and follow-up questions are not
  explicitly rendered; the UI primarily shows answer text and source links.
- Photo/voice attachments are previewed before Send, but historical bubbles
  render text/sources without an attachment preview.
- The initial history error banner offers Dismiss; history refresh is in the
  drawer. The screen lacks a prominent retry action for that read failure.
- Retrying a send with an attachment uploads it again while retaining the
  request ID, which can change the request body. Retry behavior needs an
  isolated integration test before claiming reliable photo/voice retries.
- The upstream floating support button/greeting was deferred. No Home layout,
  colors, card structure, or navigation design was redesigned.
- Existing Home copy always says Good morning, regardless of time. Its local
  conditions card still reports monitoring as disconnected. The farmer action
  opens chat without a recommendation summary or crop-context preview. These
  are findings for the next UI pass; they were not redesigned here.

Work stops after this report, before further Home design changes.

## Citizen access correction and scoped commit — 12 October 2026

The advisory API source was refreshed to `origin/main` at `d6daa9f`. Its
`TokenVerifier` validates Firebase ID tokens (including revocation), then derives
identity from issuer and subject. `current_user` and the conversation/chat routes
enforce authenticated identity and ownership without requiring a Farmer role.
The former Home `_isFarmer` gate was a client-only restriction.

The existing Home action and advisory screen are now labelled **Farming
Advisory**, and both Citizen and Farmer accounts can open it. Stored roles,
profile/auth services, Firebase settings, policies, and report records were not
changed. The layout was retained.

The rebuilt APK used the unchanged original defines and was installed as an
update. Analysis passed and both advisory token tests passed. The user confirmed
that the current Citizen entry opens and receives a live answer. Runtime
inspection independently observed the same Citizen session, one saved advisory
conversation, two messages, no advisory error, and loading/sending complete.
The running report list still loaded `CMP-E87FD7C73F90`. The verification
question created advisory conversation/messages as explicitly requested by this
acceptance task; no profile, role, or report was edited.

The reviewed staging scope contains exactly nine files: Home's advisory hunks,
advisory screen/client/README/test, dependency manifest/lockfile, Android
permissions, and iOS permission descriptions. Unrelated Home profile callbacks
and image handling are left unstaged. Generated plugin files, private `.local`
files, APKs, credentials, and unrelated work are excluded from the commit.
This report remains outside that staged scope.

Local commit created: `89bdfdfea05caaad9c23e5ec358b502867fe8168` —
**Add Farming Advisory for Citizen and Farmer accounts**. Its committed file
inventory was checked against the reviewed nine-file scope. Generated files
and unrelated existing work remain outside the commit. No push was performed.
The post-chat runtime check again showed a successful complaint list with the
existing CMP reference. The user separately confirmed that, after refreshing
following the advisory exchange, both the list and report details still load.
