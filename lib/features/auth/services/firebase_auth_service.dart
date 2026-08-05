import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

class FirebaseAuthService {
  FirebaseAuthService._();

  static final FirebaseAuthService instance = FirebaseAuthService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Send OTP
  Future<void> sendOTP({
    required String phoneNumber,
    required Function(String verificationId) codeSent,
    required Function(String error) onError,
    required VoidCallback onVerificationCompleted,
  }) async {
    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,

        timeout: const Duration(seconds: 60),

        verificationCompleted: (PhoneAuthCredential credential) async {
          try {
            await _auth.signInWithCredential(credential);
            onVerificationCompleted();
          } catch (e) {
            onError(e.toString());
          }
        },

        verificationFailed: (FirebaseAuthException e) {
          onError(e.message ?? "Phone verification failed.");
        },

        codeSent: (
          String verificationId,
          int? resendToken,
        ) {
          codeSent(verificationId);
        },

        codeAutoRetrievalTimeout: (String verificationId) {},
      );
    } catch (e) {
      onError(e.toString());
    }
  }

  /// Verify entered OTP
  Future<UserCredential?> verifyOTP({
    required String verificationId,
    required String smsCode,
  }) async {
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: smsCode,
      );

      return await _auth.signInWithCredential(credential);
    } on FirebaseAuthException {
      rethrow;
    } catch (_) {
      rethrow;
    }
  }

  /// Logout
  Future<void> signOut() async {
    await _auth.signOut();
  }

  /// Current User
  User? get currentUser => _auth.currentUser;

  /// Is Logged In
  bool get isLoggedIn => _auth.currentUser != null;
}