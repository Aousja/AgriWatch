# Firebase Auth ↔ Supabase bridge

This directory contains the additive Firebase-side foundation for the
Supabase third-party Firebase Auth integration. It does not read or modify
Firestore data.

## Deploy

From the repository root, after authenticating the Firebase CLI and selecting
the `agriwatch-pakistan` project:

```powershell
firebase deploy --only functions
```

The deployed function is
`setAuthenticatedRoleOnUserCreated`. It uses Firebase's current 2nd-gen
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
