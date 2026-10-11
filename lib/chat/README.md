# Farming Advisory in AgriWatch

After Firebase login, Citizen and Farmer accounts can open **Farming Advisory**
from the existing Home quick action. The API checks Firebase identity and
conversation ownership, with no Farmer-only role requirement. Stored account
roles are unchanged. The chat uses the current Firebase user's ID token, so there is no
second login. The API defaults to
`https://farmer-advisory-api-ashy.vercel.app` and can be overridden with
`--dart-define=API_BASE_URL=https://your-host`.

The screen supports Urdu, English, and Roman Urdu answers; saved conversations;
new chats; text questions; camera/gallery photos; and short WAV voice questions.
One attachment up to 4 MiB can be sent with each question. The microphone stops
automatically after 59 seconds. Questions and attachments are sent only when
Send is tapped.

Answers and saved conversations come from the remote advisory API, not a
bundled crop recommendation dataset or the Supabase complaints table. The
current screen does not send structured crop/district/area context; a farmer
can include that information in their question. Backend model configuration
and reviewed source coverage determine which answers are available.

This integration keeps the existing Home layout. The upstream floating support
icon and repeated greeting overlay are deferred for the later UI review.

The server must accept Firebase ID tokens issued by the same Firebase project
used by AgriWatch. Firebase Admin credentials and model API keys belong on the
server, never in this app. The app uses HTTPS, so `adb reverse` and a local API
server are not needed.

Run `flutter run --dart-define-from-file=.local/flutter-defines.json` after
adding the native recording dependency. Keep the existing defines file so
complaint tracking remains configured. A hot reload of an older installed
build cannot register a new native plugin.
