# Next-phase API inspection — no integration

Inspected the existing local `backend/main.py` and
`eng-ui/farmer-advisory-api` at commit
`addc65d79fe9b11928d8d62636c9a3475f8f0730`.
No backend, website, SQL, authentication configuration, or deployment was changed.
These are source contracts, not proof that a deployment serves them.

## Alerts and local conditions

The Flutter app has no connected alert or local-condition HTTP client.
`AppConfig.baseUrl` is still the placeholder `http://YOUR_FASTAPI_SERVER`.

| Method and exact path | Required client input | Contract / limitations |
| --- | --- | --- |
| `GET /health` | None | Backend health information. |
| `GET /districts` | None | `success`, `count`, and `districts` containing `province`/`district`. Use canonical district names rather than inventing an enum. |
| `GET /alerts` | None; no auth dependency or query parameters declared | `success`, `count`, `alerts`. Alert rows include `id`, `district`, `province`, `severity`, `message`, `sentTo`, `date`, `timestamp`, `status`. Current route returns all alerts; local/audience filtering would be client work or a future explicit API contract. A read failure raises HTTP 500. |
| `GET /predict-district/{district_name}` | District name in the path, URL-encoded | Latest stored-data drought prediction, district/province, `data_date`, `prediction_for_date`, `prediction_horizon`, and environmental measurements. This is a next-month prediction from available data; do not label it current live weather. Unknown or insufficient district data produces HTTP 404. |
| `GET /district-history/{district_name}` | District name in the path | `success`, district/province, latest dates, `current`, and up to 24 historical prediction records. Requires enough source history. |
| `GET /map-data` | None | Predictions plus coordinates for districts. Coordinates may be null. On failure this route can return HTTP 200 with `success: false` and an empty `districts` list; a client must check `success` before displaying an empty state. |
| `GET /irrigation-context/{district_name}` | District name in the path | District coordinates, dated drought prediction, and environmental measurements. Missing coordinate file is HTTP 500; a district lacking coordinates is HTTP 404 even when its prediction exists. |
| `POST /alerts` | JSON: `district`, `severity`, `message`, `audience`; `Authorization: Bearer <token>` through `require_alert_staff`, including district authorization | Firebase token with trusted admin/PDMA claims, or verified Supabase session with stored admin/district permissions. Administrative write contract inspected only. It is not a mobile Phase 1 action and was never called. |

Other source contracts, also not integrated: `POST /predict` accepts a
`features` map with all model-required numeric features; `POST
/irrigation-recommendation` requires `district`, `crop`, `area_acres` and accepts
optional `field_id` and `field_name` (default `Field`). Raw prediction inputs
must match the deployed model's feature contract; the district route builds
them server-side. They are not interchangeable with advisory chat.

Missing deployment information for a mobile connection:

- Confirmed HTTPS origin and the deployed source/model/data revision.
- Whether source-defined public reads are public in the actual deployment,
  and any gateway authentication, limits, or required headers.
- Supported/canonical districts, source-data dates, refresh cadence, and
  production alert audience/severity conventions.
- Availability and persistence of `alerts.json`, source datasets, model
  artifacts, and `district_coordinates.csv` in the deployment.
- A successful health check and existing-data read response from that origin.
  No alert was dispatched or prediction service substituted during this task.

## Farmer advisory API

Primary source:
[routes](https://github.com/eng-ui/farmer-advisory-api/blob/addc65d79fe9b11928d8d62636c9a3475f8f0730/app/main.py),
[schemas](https://github.com/eng-ui/farmer-advisory-api/blob/addc65d79fe9b11928d8d62636c9a3475f8f0730/app/schemas.py),
[authentication](https://github.com/eng-ui/farmer-advisory-api/blob/addc65d79fe9b11928d8d62636c9a3475f8f0730/app/auth.py),
[deployment guide](https://github.com/eng-ui/farmer-advisory-api/blob/addc65d79fe9b11928d8d62636c9a3475f8f0730/VERCEL_DEPLOY.md).

Every advisory endpoint except health requires `Authorization: Bearer
<Firebase ID token>`. The backend verifies the configured Firebase project
and revocation; a Supabase access token is not the declared contract. IDs are
UUIDs and ownership is enforced by the backend. JSON models reject extra fields.

| Method and exact path | Required input | Optional input / result |
| --- | --- | --- |
| `GET /api/advisory/health` | None; public | `status: ok`, `service: farmer-advisory-system`. This alone does not prove authentication or the model works. |
| `POST /api/advisory/conversations` | Firebase bearer token; JSON object (can be `{}`) | `language` defaults to `ur`; `crop_context` defaults to `{}`. Returns a conversation, HTTP 201. |
| `GET /api/advisory/conversations` | Firebase bearer token | `limit` default 30, range 1–100; `offset` default 0, minimum 0. Returns `{items: [...]}`. |
| `GET /api/advisory/conversations/{identifier}/messages` | Firebase bearer token; conversation UUID in path | `limit` default 50, range 1–100; `offset` default 0, minimum 0. Returns `{items: [...]}`. |
| `POST /api/advisory/chat` | Firebase bearer token; JSON `conversation_id`, `client_request_id` (both UUID); a nonempty `message` or one `attachment_ids` item | `message` max 4,000 characters; `language` defaults to `ur`; `attachment_ids` defaults to `[]`, max one UUID. Reuse the same `client_request_id` for the same retry. |
| `POST /api/advisory/attachments` | Firebase bearer token; multipart `conversation_id` UUID and `file` | Returns `attachment_id`, `media_type`, `processing_status`, `expires_at`; HTTP 201. Default image/audio limit 4 MiB and audio duration 60 seconds. JPEG/PNG/WebP images; WAV/MP3/Ogg/WebM/M4A/FLAC audio subject to actual decoding validation. |
| `DELETE /api/advisory/conversations/{identifier}` | Firebase bearer token; owned conversation UUID | HTTP 204. Destructive contract inspected only, never called. |
| `POST /api/advisory/feedback` | Firebase bearer token; JSON `message_id` UUID and `helpful` boolean | Optional `comment`, max 1,000 characters, defaults to empty; HTTP 204. Never called. |

Allowed `language` values: `ur`, `ur-Latn`, `en`.
Optional `crop_context` fields: `crop` (max 80 characters), `district` (max
100), `growth_stage` (max 100), positive `area_value`, and `area_unit` in
`acre`, `hectare`, `square_metre`.

The server also declares `GET /api/cron/cleanup` for Vercel only, requiring
the backend `CRON_SECRET` bearer credential. This is not a mobile endpoint
and was never called.

Missing deployment information / readiness:

- Actual API HTTPS origin, deployed commit, and target runtime. No working
  advisory deployment was established in this task.
- Confirmed `FIREBASE_PROJECT_ID` matching this mobile app, and functioning
  server-side Firebase Admin credentials. Do not embed Admin credentials in Flutter.
- Server-side `GEMINI_API_KEY`, tested `GEMINI_MODEL`, quota, and timeout settings.
- For Vercel: `APP_RUNTIME=vercel`, pooled `DATABASE_URL`, private Blob
  provisioning (`BLOB_READ_WRITE_TOKEN` or the code's supported store/identity
  configuration), `FIREBASE_SERVICE_ACCOUNT_JSON`, and `CRON_SECRET`. Confirm
  attachment storage and cleanup with the deployed version; health is insufficient.
- The guide mentions a `chatbot_backend` project directory, but this inspected
  repository has its FastAPI package at the root. Verify the actual deployment root.
- Reviewed agricultural knowledge: the checked-in sample document is
  `unapproved`; `knowledge/REVIEW.md` says only approved records are retrieved.
  No dummy farming advice was added or substituted.
- The guide describes a Flutter `API_BASE_URL` define, but the current mobile
  source does not implement that advisory client/define. This is next-phase
  integration work; existing Supabase defines must be retained alongside any
  future additional configuration.

No advisory request, attachment upload, conversation creation/deletion, or
feedback write was performed.
