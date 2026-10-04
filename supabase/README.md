# Firebase bridge verification fixture

`migrations/20261004_firebase_bridge_test.sql` is an isolated, test-only
table. Apply it in the Supabase SQL Editor only after confirming the project
is the one used by the Flutter build. It grants the `authenticated` role only
`INSERT` and `SELECT`, and both policies constrain rows to the Firebase JWT
`sub` claim. There are no update or delete policies.

The Flutter app's debug-only verification action calls
`SupabaseBridge.verifyIsolatedRoundTrip()`. It inserts one row and then reads
that exact row back. Do not point this check at any application table.

After the milestone is complete, remove the fixture with:

```sql
drop table if exists public.firebase_bridge_test_rows;
```

The Flutter app must receive only `SUPABASE_URL` and the publishable/anon key
through `--dart-define`. Never put a Supabase service-role key or Firebase
Admin credential in the app or repository.
