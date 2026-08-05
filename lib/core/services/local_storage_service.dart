import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  static late SharedPreferences _prefs;

  /// Initialize SharedPreferences
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // -----------------------------
  // Language
  // -----------------------------

  static Future<void> setLanguage(String languageCode) async {
    await _prefs.setString('language', languageCode);
    await _prefs.setBool('language_selected', true);
  }

  static String getLanguage() {
    return _prefs.getString('language') ?? 'en';
  }

  static bool isLanguageSelected() {
    return _prefs.getBool('language_selected') ?? false;
  }

  // -----------------------------
  // Login
  // -----------------------------

  static Future<void> setLoggedIn(bool value) async {
    await _prefs.setBool('is_logged_in', value);
  }

  static bool isLoggedIn() {
    return _prefs.getBool('is_logged_in') ?? false;
  }

  // -----------------------------
  // Logout
  // -----------------------------

  static Future<void> logout() async {
    await _prefs.setBool('is_logged_in', false);
  }

  // -----------------------------
  // Clear Everything
  // -----------------------------

  static Future<void> clearAll() async {
    await _prefs.clear();
  }
}