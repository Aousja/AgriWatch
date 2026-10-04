import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/services/supabase_bridge.dart';

class FirebaseAuthService {
  FirebaseAuthService._();

  static final FirebaseAuthService instance = FirebaseAuthService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;

  /// Send OTP
  Future<void> sendOTP({
    required String phoneNumber,
    required Function(String verificationId) codeSent,
    required Function(String error) onError,
    required Future<void> Function(UserCredential credential)
      onVerificationCompleted,
  }) async {
    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,

        timeout: const Duration(seconds: 60),

        verificationCompleted: (PhoneAuthCredential credential) async {
          try {
            final userCredential = await _auth.signInWithCredential(credential);
            await SupabaseBridge.refreshTokenAfterClaimAssignment();
            await onVerificationCompleted(userCredential);
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

      final userCredential = await _auth.signInWithCredential(credential);
      await SupabaseBridge.refreshTokenAfterClaimAssignment();
      return userCredential;
    } on FirebaseAuthException {
      rethrow;
    } catch (_) {
      rethrow;
    }
  }

  /// Sign in with Google
  Future<UserCredential?> signInWithGoogle() async {
    try {
      final googleUser = await _googleSignIn.authenticate();
      final googleAuth = googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
      );

      final userCredential = await _auth.signInWithCredential(credential);
      await SupabaseBridge.refreshTokenAfterClaimAssignment();
      return userCredential;
    } on FirebaseAuthException catch (e) {
      final code = e.code.toLowerCase();
      if (code.contains('cancel') || code.contains('aborted')) {
        return null;
      }
      rethrow;
    } catch (e) {
      final message = e.toString().toLowerCase();
      if (message.contains('cancel') || message.contains('aborted')) {
        return null;
      }
      rethrow;
    }
  }

  Future<AuthCredential?> getGoogleCredential() async {
    try {
      final googleUser = await _googleSignIn.authenticate();
      final googleAuth = googleUser.authentication;
      return GoogleAuthProvider.credential(idToken: googleAuth.idToken);
    } on FirebaseAuthException catch (e) {
      if (e.code.contains('cancel') || e.code.contains('aborted')) return null;
      rethrow;
    }
  }

  AuthCredential emailCredential({
    required String email,
    required String password,
  }) {
    return EmailAuthProvider.credential(
      email: email.trim(),
      password: password.trim(),
    );
  }

  Future<UserCredential> linkCredential(AuthCredential credential) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw FirebaseAuthException(
        code: 'no-current-user',
        message: 'Please sign in before linking another method.',
      );
    }
    return user.linkWithCredential(credential);
  }

  /// Sign in with email and password
  Future<UserCredential?> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password.trim(),
      );
      await SupabaseBridge.refreshTokenAfterClaimAssignment();
      return userCredential;
    } on FirebaseAuthException {
      rethrow;
    } catch (_) {
      rethrow;
    }
  }

  /// Create email account if needed
  Future<UserCredential?> createUserWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final userCredential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password.trim(),
      );
      await SupabaseBridge.refreshTokenAfterClaimAssignment();
      return userCredential;
    } on FirebaseAuthException {
      rethrow;
    } catch (_) {
      rethrow;
    }
  }

  /// Logout
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }

  /// Current User
  User? get currentUser => _auth.currentUser;

  /// Is Logged In
  bool get isLoggedIn => _auth.currentUser != null;
}
