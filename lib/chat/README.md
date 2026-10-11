# Farmer advisory in AgriWatch

After Firebase login, the floating support icon opens Farmer Advisory from any
screen. The chat uses the current Firebase user's ID token, so there is no
second login. The API defaults to
`https://farmer-advisory-api-ashy.vercel.app` and can be overridden with
`--dart-define=API_BASE_URL=https://your-host`.

The screen supports Urdu, English, and Roman Urdu answers; saved conversations;
new chats; text questions; camera/gallery photos; and short WAV voice questions.
One attachment up to 4 MiB can be sent with each question. The microphone stops
automatically after 59 seconds. Questions and attachments are sent only when
Send is tapped.

The server must accept Firebase ID tokens issued by the same Firebase project
used by AgriWatch. Firebase Admin credentials and model API keys belong on the
server, never in this app. The app uses HTTPS, so `adb reverse` and a local API
server are not needed.

Run `flutter run` after adding the native recording dependency. A hot reload of
an older installed build cannot register a new native plugin.
