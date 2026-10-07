# M08 drought situation reports — expand, release clients, finalize

Both clients keep public.complaints and CMP references. Existing records,
including CMP-7A1E716B604A, are never relabeled, deleted, or rewritten.

## Inspection and verification limits

The user inspected live schema and reported that complaints_status_check allows
only Under Review, Forwarded, and Resolved. The corrected expansion preflights
the exact validated, inheritable, single-status-column CHECK definition under an
ACCESS EXCLUSIVE lock before replacing it. The expected PostgreSQL catalog text
is CHECK ((status = ANY (ARRAY['Under Review'::text, 'Forwarded'::text, 'Resolved'::text]))).
A missing/unvalidated/differently ordered or defined constraint, another
status CHECK, non-text/nullable status, or a changed default aborts the whole
transaction. Equivalent but differently rendered definitions require inspection
and an explicitly reviewed preflight correction, not bypassing the check.

The constraint is extended to all five values with NOT VALID followed by VALIDATE
in the same transaction. Under Review, Forwarded, and Resolved remain allowed
permanently so old rows continue to work. Submitted and Assigned for PDMA review
are added. No existing row is updated.

The actual original SQL in both checkouts contained no backslashes, including
no literal Markdown escapes. The corrected expansion and finalization sources
also have none. Firebase issuer matching remains exactly
https://securetoken.google.com/agriwatch-pakistan.

No SQL was executed, and no deployment happened. Local checks verify source
structure, compatibility branches, grants, finalization, preservation, and
literal issuer bytes; they do not execute PostgreSQL or establish live RLS.
Use m08_inspect_read_only.sql before any scheduled rollout. The original CMP
category still requires a live record check; regression fixtures are synthetic.

## Exact rollout order — not authorization to execute

1. DATABASE EXPANSION: after catalog/RLS/JWT validation, apply only
   migrations/20261008_m08_drought_report_review.sql. It requires the existing
   M08 shared-complaints baseline and trusted admin/identity helpers. If that
   baseline is absent, stop and prepare a reviewed single transaction containing
   the baseline and expansion statements, excluding their individual BEGIN/COMMIT
   wrappers. Do not apply the baseline alone to active old clients: its narrower
   INSERT grants would reject their explicit status payloads until expansion.
   Migration 6 is neither required nor included. Do not run the legacy demo setup
   or the separate finalization file. Validate old web and mobile submissions and
   admin responses using real sessions before releasing the new web.
2. WEB RELEASE: publish the updated Afaq web after expansion validation.
   New farmer/public forms offer only the four drought situations; admin writes
   use the authorized RPC; PDMA sees only explicitly assigned, verified-area
   reports. Confirm updated web assets are served and clear/expire old cached
   bundles and tabs according to the release policy. Keep PDMA permissions empty
   during this step so assignments cannot start before supported mobile tracking
   is updated. Existing server-side authority remains the boundary.
3. MOBILE RELEASE: release the updated Flutter client after the new web is
   verified. Confirm owner tracking, admin responses, and new submissions on
   supported phone builds. These clients omit status on INSERT and work with the
   compatibility default as well as the eventual Submitted default.
   Independently verify PDMA identity/district authority, then provision trusted
   permission rows and test explicit assignments, wrong district/user, revocation
   and reassignment. Signup rows do not grant authorization.
4. DATABASE FINALIZATION, LATER: only after the retirement gates below are met,
   manually apply rollout/m08_finalize_drought_report_compatibility.sql. It is
   deliberately outside migrations/ so a migration batch cannot silently remove
   compatibility at the initial database step. No finalization is authorized now.

## Temporary compatibility and its removal

During expansion the default remains Under Review. Owner INSERT RLS accepts
only Submitted or Under Review and requires all response/review/assignment/
resolution fields to be null. A temporary column INSERT grant permits old web
payloads with explicit status: Under Review. A client cannot submit Forwarded,
Resolved or Assigned for PDMA review through this path.

The INSERT-only trigger temporarily accepts these exact deployed choices,
preserving the submitted text and old optional fields:

- Mobile: Pest infestation; Water shortage; Crop damage; Drought / weather; Other.
- Farmer web: Crop Failure; Irrigation Shortage; Livestock Loss; Other.
- Public web: Water Shortage; Crop Damage; Livestock Loss; Well / Tubewell Dried Up;
  Relief Not Received; Other.

The four NEW drought categories still require district and a description of at
least 10 characters. Updated clients never display legacy submission choices.
Legacy categories remain temporarily accepted by the database only to support
old binaries and stale web bundles.

Expansion also preserves direct UPDATE of only status, resolution_note,
handled_by, and updated_at for allowlisted AgriWatch admins, under an explicitly
admin-only policy. It revokes any blanket/other-column UPDATE privileges first.
Assignment and action timestamp fields stay RPC-only. This keeps the old admin
web usable until web release. Anonymous callers, signup-only PDMA users, and
unverified officer rows never gain legacy write compatibility. Losing former
broad PDMA access is an intentional security correction, not a compatibility
exception.

An old direct admin write does not synthesize review/assignment timestamps.
Updated tracking treats default Under Review as pending, Forwarded as a legacy
flag rather than a government referral, and old Resolved as a recorded legacy
status without inventing a completion time. Actual new RPC actions carry server
timestamps/actors. The new PDMA desk is read-only.

Retirement gates: verify all supported mobile builds use the new contract; ensure
older builds cannot resume submitting under the supported-version/update policy;
eliminate stale web/admin bundles; verify new clients in real JWT/RLS tests; and
confirm there are no new legacy-category inserts after the established retirement
cutoff. There is currently no minimum-mobile-version enforcement feature in these
checkouts. Therefore a calendar date or a quiet database alone is not enough to
retire old mobile clients. Keep compatibility until the release owner can enforce
or demonstrate that cutoff. The existing access-request workflow is not involved.

At that point the separate finalization transaction:

- Checks the exact validated five-value constraint, compatibility default, and
  expected schema/policies before changing anything.
- Switches the INSERT default and owner policy to Submitted only.
- Revokes INSERT(status), removes the legacy category branch of the INSERT-only
  validator, and keeps the existing trigger (historical rows remain untouched).
- Drops temporary direct admin UPDATE policy and all UPDATE column/table grants.
  The authorized admin RPC becomes the only authenticated review write path.
- Changes the access RPC rollout_phase marker from compatibility to strict and
  asserts that temporary grants are gone. Constraint values stay at all five.

The four new submission categories, RPCs, owner reads, assigned verified-area
PDMA reads, and old CMP records work across finalization without another client
change. Attempts from retired clients will then be intentionally rejected.

## Remaining rollout checks

Test real JWT/RLS with Firebase owner and other owner, web owner, allowlisted
admin, signup-only PDMA, verified unassigned PDMA, correct/wrong assignment area
and user, revoked permissions, anonymous caller, forged completion fields,
legacy explicit pending status, and attempted completed insertion status.
Check legacy CMP readability and category before/after both transactions.
Confirm old admin direct writes during grace and their rejection after retirement.
Never claim a row or legacy Forwarded flag is proof of government action.

Routine farming questions go to existing web crop advice (/farmer/crops).
The phone's existing Home crop-advisory entry is still a placeholder; the new
reporting copy explains that limitation. No advice backend was invented.
Existing access-request tables/functions/flow and migration 6 are unchanged.
