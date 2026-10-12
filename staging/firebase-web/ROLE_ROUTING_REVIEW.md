# Staging phone authentication and stored-role routing

**Update:** The two exact preview hostnames were subsequently authorized with
explicit user approval and the corrected build deployed as a preview. Production
aliases and the database remain unchanged. See [STAGING_OTP_RETRY.md](STAGING_OTP_RETRY.md)
for the current status; the findings below describe the earlier local review.

10 October 2026. Changes are confined to the staging copy and ignored local
diagnostics. No production source, deployment, Firebase configuration, security
rules, profile, role grant, or database row was changed for this work.

## Domain diagnosis

A live read of Firebase Authentication's public project configuration confirmed
that `agri-watch-afe71g4sx-afaq-munirs-projects.vercel.app` is absent from
`authorizedDomains`. The returned domains were `localhost`,
`agriwatch-pakistan.firebaseapp.com`, `agriwatch-pakistan.web.app`, and
`agri-watch-rho.vercel.app`.

This is a confirmed configuration defect consistent with the reported
`auth/captcha-check-failed`; it is not evidence against the phone number or
the pre-login dropdown. A second live read of the public reCAPTCHA Enterprise
configuration returned `ENFORCEMENT_STATE_UNSPECIFIED` for the phone provider,
no configured Enterprise site key, and disabled SMS bot-score/toll-fraud flags.
These findings do not establish an Enterprise enforcement failure; the SDK still
uses its normal phone-auth reCAPTCHA verifier. The shared project's phone-provider
enablement and administrative reCAPTCHA settings could not be verified with the
cached CLI credential.
Firebase documents invalid, expired, reused, and disallowed-domain challenges
as possible causes: https://docs.cloud.google.com/identity-platform/docs/error-codes

The staging code now checks the project number, auth domain and current hostname
against Firebase's public configuration before constructing a fresh verifier or
requesting SMS. Failed attempts clear the verifier. Normal Firebase reCAPTCHA
remains enabled, with no verification bypass or mocked live OTP.

The concrete configuration correction would add only the hostname above to the
existing Firebase authorized domains while preserving every current entry.
It has **not** been applied: this is shared production Firebase configuration,
and the user explicitly requested production remain unchanged.

## Stored-role routing

After Firebase establishes a non-anonymous session, the staging page automatically
uses its UID to read the configured profile store. It requires the existing
database bridge claim, validates profile/membership ownership, and discards
results if the signed-in UID changes during the read.

The existing Firebase membership schema is the profile's single `role` field:
`farmer` routes to Farmer and `citizen` routes to General Public. An explicitly
stored `public` role is also normalized to General Public. Missing profiles and
missing personal memberships show setup instructions for the existing mobile
profile flow. No profile or membership is created by this page. Read errors are
errors, not an empty profile or an invitation to grant a role.

The membership resolver supports multiple UID-owned records through its explicit
read-only adapter: exactly both personal memberships expose a chooser with no
preselected portal. The current single-role Firebase store cannot represent both;
no second membership store was invented and no migration was performed. Legacy
`website_signup_requests` memberships belong to Supabase Auth UUIDs, not Firebase
UIDs, and must not be associated by phone/email equality.

The pre-login dropdown is only a display hint. Its value never reaches OTP,
profile lookup, membership resolution, or a write operation. Personal portal
views stay within the isolated staging diagnostic page; existing production
dashboards still use their existing authentication.

Displayed role evidence and the observation download exclude phone numbers,
tokens, and raw profiles/request bodies.

## Validation and live acceptance

20 staging tests passed, including single/both/neither memberships, foreign
ownership, identity changes, read errors, missing claims, and unauthorized-domain
rejection before SMS. The staging build passed. Static lint was checked.

The production Vercel alias `agri-watch-rho.vercel.app` was independently read
and still points to `dpl_HBPPne8MJx8eTqePLVRyjufDbXAj`.

**Stored role for the screenshot's test account: unverified.** No available
browser connection or successful web OTP supplied a verified test UID during
this task. A mock role, pre-login selection, and unrelated disposable email
accounts are not live role evidence. Once the authorized-domain issue is
resolved and real OTP succeeds, the page displays the UID and stored profile
role automatically; record only the stored role and portal decision.

The updated build is local and reviewable. The existing hosted staging deployment
has not been replaced, and production has not been promoted or aliased.
