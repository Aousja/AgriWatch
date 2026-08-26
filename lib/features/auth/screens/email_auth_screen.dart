import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import 'package:agriwatch/core/services/local_storage_service.dart';
import 'package:agriwatch/features/auth/services/firebase_auth_service.dart';

import '../auth_gate.dart';
import 'phone_screen.dart';

class EmailAuthScreen extends StatefulWidget {
  final String mode;

  const EmailAuthScreen({super.key, this.mode = 'signIn'});

  @override
  State<EmailAuthScreen> createState() => _EmailAuthScreenState();
}

class _EmailAuthScreenState extends State<EmailAuthScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;

  bool get _isUrdu => LocalStorageService.getLanguage() == 'ur';

  Future<void> _handleAuth({required bool createAccount}) async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showMessage('Please enter your email and password.', isError: true);
      return;
    }

    if (password.length < 6) {
      _showMessage('Password must be at least 6 characters long.', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Never let a previous Firebase session affect this explicit auth action.
      await FirebaseAuthService.instance.signOut();

      final credential = createAccount
          ? await FirebaseAuthService.instance.createUserWithEmailAndPassword(
              email: email,
              password: password,
            )
          : await FirebaseAuthService.instance.signInWithEmailAndPassword(
              email: email,
              password: password,
            );

      if (credential == null) {
        _showMessage('Authentication failed. Please try again.', isError: true);
        setState(() => _isLoading = false);
        return;
      }

      await LocalStorageService.setLoggedIn(true);

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const AuthGate()),
      );
    } on FirebaseAuthException catch (e) {
      if (e.code == 'account-exists-with-different-credential') {
        _showMessage(
          'An account already exists for this email. Please sign in with the method you originally used, then link this one from Settings.',
          isError: true,
        );
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const PhoneScreen(mode: 'signIn')),
        );
        return;
      }
      _showMessage(
        _getFriendlyEmailMessage(e.code, createAccount: createAccount),
        isError: true,
      );
    } catch (e) {
      _showMessage(
        'Authentication failed. Please try again.',
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getFriendlyEmailMessage(String code, {required bool createAccount}) {
    if (createAccount) {
      switch (code) {
        case 'email-already-in-use':
          return 'This email is already linked to an account. Please use the sign-in method used when you registered, such as Google.';
        case 'weak-password':
          return 'Password is too weak. Please choose a stronger one.';
        case 'invalid-email':
          return 'Please enter a valid email address.';
        case 'operation-not-allowed':
          return 'Email sign-up is currently disabled. Please contact support.';
        default:
          return 'Sign up failed. Please try again.';
      }
    }

    switch (code) {
      case 'user-not-found':
        return 'No email/password account found. If you registered with Google, please continue with Google instead.';
      case 'invalid-credential':
        return 'No valid email/password account found. Please sign up first or use the provider used during registration.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'user-disabled':
        return 'This account has been disabled. Please contact support.';
      default:
        return 'Sign in failed. Please try again.';
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF2E7D32);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Iconsax.arrow_left),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              Center(
                child: Image.asset(
                  'assets/images/Agriwatch logo.png',
                  width: 75,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                widget.mode == 'signUp'
                    ? (_isUrdu ? 'اپنا اکاؤنٹ بنائیں' : 'Create your AgriWatch account')
                    : (_isUrdu ? 'ای میل کے ساتھ سائن اِن کریں' : 'Sign in with Email'),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                widget.mode == 'signUp'
                  ? (_isUrdu
                    ? 'اپنا اکاؤنٹ شروع کرنے کے لیے ای میل استعمال کریں۔'
                    : 'Use your email to get started with AgriWatch.')
                  : (_isUrdu
                    ? 'جاری رکھنے کے لیے اپنے اکاؤنٹ میں سائن اِن کریں۔'
                    : 'Sign in to your account to continue.'),
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: _isUrdu ? 'ای میل ایڈریس' : 'Email address',
                  prefixIcon: const Icon(Iconsax.sms),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: _isUrdu ? 'پاس ورڈ' : 'Password',
                  prefixIcon: const Icon(Iconsax.lock),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 58,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: green,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                    onPressed: widget.mode == 'signUp' || _isLoading
                      ? null
                      : () => _handleAuth(createAccount: false),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                        : Text(
                          _isUrdu ? 'سائن اِن' : 'Sign In',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 58,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: green,
                    side: const BorderSide(color: Color(0xFF2E7D32), width: 1.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                    onPressed: widget.mode == 'signIn' || _isLoading
                      ? null
                      : () => _handleAuth(createAccount: true),
                  child: Text(
                    _isUrdu ? 'اکاؤنٹ بنائیں' : 'Create Account',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
