# Corrected staging OTP retry

10 October 2026. Updated preview:
https://agri-watch-enqk71wc4-afaq-munirs-projects.vercel.app/staged-sign-in

Deployment `dpl_BCXnMxwY9Muuc2kCGU7QFvyz9iT4` is READY with preview target
(`target: null`). All eleven uploaded build-file hashes match the tested local
build through the authenticated Vercel API. Public HTTP requests reach Vercel's
sign-in protection, so open the preview with the Vercel account used for the
earlier preview. No protection settings were changed.

## Configuration and production preservation

The user explicitly approved adding the original preview hostname to Firebase
Authorized Domains. Its unique Vercel deployment URL could not be reassigned
(`alias_in_use`), so the user separately approved authorizing the corrected
preview hostname. Both additions were applied with Firebase CLI's supported
Auth configuration client and an authorizedDomains-only update mask. Every
preexisting domain was preserved; no other Firebase setting was modified.

The original hostname still serves the original build. Use the corrected URL
above for the new role routing and independent recovery checks.

The project slug and project number were independently verified via Google's
Cloud Resource Manager API. `phoneSite.js` now compares `projectId` with
`projectId` and `messagingSenderId` with `messagingSenderId`. The legacy public
Identity Toolkit response's numeric `projectId` is explicitly normalized as
`authProjectNumber` and compared with the verified project number; it is never
compared with the sender ID. The expected sender ID matches the existing
FlutterFire web configuration. Regression coverage rejects ID/sender swaps,
incorrect project numbers, and unauthorized hostnames before CAPTCHA/SMS.

All three production aliases remain on `dpl_HBPPne8MJx8eTqePLVRyjufDbXAj`:
`agri-watch-rho.vercel.app`, `agri-watch-afaq-munirs-projects.vercel.app`, and
`agri-watch-git-main-afaq-munirs-projects.vercel.app`. No production deploy,
promotion, database write, migration, profile write, or role grant was performed.

## OTP and evidence

After successful Firebase sign-in the page automatically reads the profile,
personal memberships, CMP reports, and access requests using that authenticated
Firebase UID. The pre-login dropdown is not consulted. Data errors are shown
separately from successful empty reads. A `citizen` membership maps to General
Public, `farmer` to Farmer, both personal memberships allow a choice, and neither
shows setup. The existing Firebase profile store currently has one role field;
legacy Supabase Auth registrations are not joined by phone or email.

After a live retry, download **web observations** and share that JSON. It records
the verified UID, whether OTP was confirmed on this page or a session restored,
the stored profile role, and separate CMP/profile/access-request read statuses
and counts. It excludes phone numbers, auth tokens, and raw profile/request
bodies. CMP evidence includes only IDs, references and statuses.

Until that verified-user evidence is available, the stored account role and each
data-recovery result remain **pending**; neither test fixtures nor dropdown
selection establish a live account role.

Validation: 20 staging tests passed; staging build and static lint passed.
Browser rendering and real OTP acceptance await the user's signed-in retry.
