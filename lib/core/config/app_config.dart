class AppConfig {
  const AppConfig._();

  /// ========= DEVELOPMENT FLAGS =========

  // Authentication
   /// Skip Firebase Phone OTP completely
  static const bool useFirebaseOTP = false;

  /// During development, always start on the login screen even if a session exists.
  /// Set this to false once the app is ready for production behavior.
  static const bool forceLoginScreenOnStartup = true;

  // Backend
  static const bool useMockAPI = false;

  // Notifications
  static const bool enablePushNotifications = true;

  // Maps
  static const bool enableMapCaching = true;

  // Analytics
  static const bool enableAnalytics = false;

  // Logging
  static const bool debugMode = true;

  static const String baseUrl =
      "http://YOUR_FASTAPI_SERVER";
}