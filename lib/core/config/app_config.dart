class AppConfig {
  const AppConfig._();

  /// ========= DEVELOPMENT FLAGS =========

  // Authentication
   /// Skip Firebase Phone OTP completely
  static const bool useFirebaseOTP = false;

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