# Local farmer/public Firebase preview

This folder is an isolated copy of the current React source. The original
web checkout, mobile source, and production deployments are untouched by this
staging implementation. See [AUDIT.md](AUDIT.md) for identity/storage findings,
exact data mapping, and pending acceptance evidence.

The corrected hosted preview is ready at
https://agri-watch-enqk71wc4-afaq-munirs-projects.vercel.app/staged-sign-in .
Both the original and corrected preview hostnames were authorized with explicit
user approval. Vercel preview sign-in protection remains enabled. Production
aliases and the database are unchanged. See [STAGING_OTP_RETRY.md](STAGING_OTP_RETRY.md)
for the configuration correction and privacy-safe live evidence workflow.

The ignored `.env.staging.local` has been prepared with the mobile project's
public Supabase client key. On another machine, copy `.env.staging.example` to
`.env.staging.local` and provide the public key. Do not use a service-role key.

```powershell
cd C:\agriwatch_mobile\agriwatch\staging\firebase-web
npm ci
npm run dev:staged
```

Open **http://localhost:5178/staged-sign-in** to review the local implementation.
The local SMS attempt failed with `auth/invalid-app-credential`. Firebase's current
phone-auth documentation excludes localhost as a hosted phone-auth domain, even
when listed in authorized domains. Real SMS acceptance needs an HTTPS staging
hostname authorized in the shared Firebase project. Use the corrected preview
above for this authorized test. Keep the normal web login for existing
Supabase accounts.

1. On mobile, sign into the disposable phone account by SMS OTP. Complete a
   clearly labelled disposable Farmer profile if needed.
2. Submit one clearly labelled disposable drought report on mobile, then reload
   it and record its exact CMP reference and report details.
3. On an authorized HTTPS staging preview, use SMS OTP for the same phone number. Record the shown
   Firebase UID. Click **Load my saved data** and compare the exact CMP reference,
   report ID, category, description, and status with mobile.
4. Independently record the mobile Firebase UID. The existing debug app's
   Settings > Run isolated Supabase test dialog displays its owner UID when
   successful; this creates a disposable bridge-test row, not a CMP report.
   Do not run this on a real user's session. UID must match the preview exactly.
5. Record profile and access-request results separately. An empty result means
   no row/document for this UID, while an error means that read was not verified.
   A brand-new Farmer with no requests cannot certify historical request recovery.
6. Only after recording phone-only identity/report results, select **Link my
   Google account**. Compare UID before/after and reload the same report. If the
   credential belongs to another Firebase identity, stop; do not merge accounts.
7. Record incorrect OTP rejection, normal challenge behavior when Firebase asks,
   sign-out denial, and returning sign-in after reload on both platforms.
   Download the web observations without tokens. They are not an automatic live
   acceptance certificate.

```powershell
npm run test:staged
npm run build:staged
npm run build
.\node_modules\.bin\oxlint.cmd src\staged src\main.jsx test\firebase-identity.test.mjs
```

No rollout command is included. Production release is held until the disposable
phone test passes and the profile/history results have been recorded separately.
