/// Build-time Supabase settings.
///
/// Supply these values with Flutter's --dart-define or
/// --dart-define-from-file flags. They are intentionally not stored in the
/// repository. The publishable/anon key is safe for a client application;
/// never put a Supabase secret/service-role key here.
class SupabaseConfig {
  const SupabaseConfig._();

  static const String url = String.fromEnvironment('SUPABASE_URL');

  /// Keep Firestore profile reads/writes active until the mobile Supabase
  /// profile table has been applied and verified on a phone.
  static const bool useSupabaseProfiles = bool.fromEnvironment(
    'USE_SUPABASE_PROFILES',
    defaultValue: false,
  );

  /// Keep Firestore access-request reads/writes active until the shared
  /// access_requests migration and phone verification are complete.
  static const bool useSupabaseAccessRequests = bool.fromEnvironment(
    'USE_SUPABASE_ACCESS_REQUESTS',
    defaultValue: false,
  );

  static const String publishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  static bool get isConfigured => url.isNotEmpty && publishableKey.isNotEmpty;
}
