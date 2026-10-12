# Agreed FYP acceptance scope: Authentication and drought situation reports

This records the revised agreement for presentation and acceptance. Preserve the
original scope PDF as the historical baseline; assess report completion against
this agreed revision and include it with the presentation scope documentation.

## Authentication

Real Firebase phone OTP on supported builds; sign-in/sign-out, persistent returning
sessions and profile loading; protected APIs validate identity; trusted admin
approval grants the application role and a token refresh displays it. Firebase's
Supabase integration claim remains `role: authenticated`; application authority
is separate. Farmer/citizen registration cannot self-grant staff authority.
The mobile authentication/report path is Firebase Auth to Supabase. ML integration
is planned later; no mobile-to-FastAPI login connection is required for completion.

## Drought Report / Complaint Management

Replace new crop-damage complaint choices with these drought situation categories:

1. Prolonged water shortage affecting an area or multiple farms
2. Observed drought conditions affecting a community
3. Incorrect or missing AgriWatch drought alert
4. Other drought-related situation

A farmer submits, receives a CMP reference, restarts the app, and tracks that same
stored report. AgriWatch admin reviews/responds and controls assignment/reassignment.
An explicitly authorized PDMA user may view an assigned report in their permitted
district, review, respond, and mark resolved. PDMA cannot assign/reassign reports.
Wrong-district, unassigned, signup-only, revoked, and other users must be denied.
Farmer tracking displays recorded admin and PDMA responses/actions. Existing farmer
and admin interfaces remain; historical references/categories and supported older
app inserts remain compatible. A default/legacy status alone proves no review or
government action. Assignment is an application review workflow, not evidence that
government relief or field intervention occurred.

Declare either module 100% only after its full deployed acceptance workflow passes.
Local implementation/tests alone are insufficient. See ../AUTH_REPORT_ROLLOUT.md.
