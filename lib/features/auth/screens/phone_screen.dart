import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../widgets/auth_button.dart';
import '../widgets/auth_textfield.dart';
import 'email_auth_screen.dart';
import 'otp_screen.dart';
import 'package:agriwatch/core/utils/phone_utils.dart';
import '../services/firebase_auth_service.dart';
import 'package:agriwatch/core/config/app_config.dart';
import 'package:agriwatch/core/services/local_storage_service.dart';
import '../auth_gate.dart';
import '../widgets/google_logo_icon.dart';

class PhoneScreen extends StatefulWidget {
  final String mode;

  const PhoneScreen({
    super.key,
    this.mode = 'signIn',
  });

  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  final TextEditingController phoneController = TextEditingController();

  bool isLoading = false;

  bool get _isUrdu => LocalStorageService.getLanguage() == 'ur';

  bool get isValid {
    return PhoneUtils.isValid(phoneController.text);
  }

  @override
  void initState() {
    super.initState();

    phoneController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    phoneController.dispose();
    super.dispose();
  }

  Future<void> sendOTP() async {

  // ==========================
  // DEVELOPMENT MODE
  // ==========================
  if (!AppConfig.useFirebaseOTP) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OTPScreen(
          phoneNumber: PhoneUtils.firebaseNumber(
            phoneController.text,
          ),
          verificationId: "development_mode",
          mode: widget.mode,
        ),
      ),
    );
    return;
  }

  // ==========================
  // FIREBASE MODE
  // ==========================

  setState(() {
    isLoading = true;
  });

  await FirebaseAuthService.instance.sendOTP(
    phoneNumber: PhoneUtils.firebaseNumber(
      phoneController.text,
    ),

    codeSent: (verificationId) {
      setState(() {
        isLoading = false;
      });

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OTPScreen(
            phoneNumber: PhoneUtils.firebaseNumber(
              phoneController.text,
            ),
            verificationId: verificationId,
            mode: widget.mode,
          ),
        ),
      );
    },

    onVerificationCompleted: (credential) async {
      setState(() {
        isLoading = false;
      });

      final isNewUser = credential.additionalUserInfo?.isNewUser ?? false;

      if (widget.mode == 'signIn' && isNewUser) {
        await FirebaseAuth.instance.currentUser?.delete();
        await FirebaseAuth.instance.signOut();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No account found for this phone number. Please sign up first.',
            ),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      if (widget.mode == 'signUp' && !isNewUser) {
        await FirebaseAuth.instance.signOut();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'This phone account already exists. Please sign in instead.',
            ),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      LocalStorageService.setLoggedIn(true);

      if (!mounted) return;

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const AuthGate()),
        (route) => false,
      );
    },

    onError: (error) {
      setState(() {
        isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: Colors.red,
        ),
      );
    },
  );
}
  @override
  Widget build(BuildContext context) {
    const green = Color(0xff2E7D32);

    return Scaffold(
      resizeToAvoidBottomInset: true,
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
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.fromLTRB(
            24,
            0,
            24,
            MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              Hero(
                tag: "app_logo",
                child: Center(
                  child: Image.asset(
                    "assets/images/Agriwatch logo.png",
                    width: 78,
                  ),
                ),
              ),

              const SizedBox(height: 18),

              Text(
                widget.mode == 'signIn'
                    ? (_isUrdu ? 'خوش آمدید' : 'Welcome back')
                    : (_isUrdu ? 'اپنا اکاؤنٹ بنائیں' : 'Create your account'),
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),

              const SizedBox(height: 10),

              Text(
                widget.mode == 'signIn'
                    ? (_isUrdu
                        ? 'آپ کیسے سائن اِن کرنا چاہتے ہیں؟'
                        : 'How would you like to sign in?')
                    : (_isUrdu
                        ? 'شروع کرنے کے لیے طریقہ منتخب کریں۔'
                        : 'Choose how you would like to get started.'),
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 16,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 18),

              Text(
                widget.mode == 'signIn'
                    ? (_isUrdu
                        ? 'اپنا موبائل نمبر درج کریں، ہم تصدیقی کوڈ بھیجیں گے۔'
                        : "Use your mobile number and we'll send a verification code.")
                    : (_isUrdu
                        ? 'کسانوں کے لیے تجویز کردہ، تصدیقی کوڈ بھیجا جائے گا۔'
                        : "Recommended for farmers. We'll send a verification code."),
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 24),

              Text(
                _isUrdu ? 'فون نمبر' : 'Phone number',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),

              const SizedBox(height: 10),

              AuthTextField(
                
                controller: phoneController,
              ),

              const SizedBox(height: 12),

              Row(
                children: [
                  const Icon(
                    Iconsax.info_circle,
                    size: 18,
                    color: green,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                        _isUrdu
                          ? 'فی الحال صرف پاکستانی موبائل نمبرز معاونت یافتہ ہیں۔'
                          : 'Only Pakistani mobile numbers are currently supported.',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 26),

              

              AuthButton(
                  text: isLoading
                    ? (_isUrdu ? 'بھیجا جا رہا ہے...' : 'Sending...')
                    : (_isUrdu ? 'فون کے ساتھ جاری رکھیں' : 'Continue with Phone'),
                onPressed: isValid && !isLoading ? sendOTP : null,
              ),

              const SizedBox(height: 22),

              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      _isUrdu ? 'یا اس کے ساتھ جاری رکھیں' : 'or continue with',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                ],
              ),

              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 58,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.maybeOf(context);
                    final navigator = Navigator.of(context);

                    try {
                      final credential = await FirebaseAuthService.instance.signInWithGoogle();

                      if (!mounted) return;

                      if (credential == null) {
                        messenger?.showSnackBar(
                          const SnackBar(content: Text('Google sign-in was cancelled.')),
                        );
                        return;
                      }

                      final isNewUser = credential.additionalUserInfo?.isNewUser ?? false;

                      if (widget.mode == 'signIn' && isNewUser) {
                        await FirebaseAuth.instance.currentUser?.delete();
                        await FirebaseAuth.instance.signOut();

                        if (!mounted) return;

                        messenger?.showSnackBar(
                          const SnackBar(
                            content: Text('No Google account found. Please sign up first.'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      if (widget.mode == 'signUp' && !isNewUser) {
                        await FirebaseAuth.instance.signOut();

                        if (!mounted) return;

                        messenger?.showSnackBar(
                          const SnackBar(
                            content: Text('This account already exists. Please sign in instead.'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      await LocalStorageService.setLoggedIn(true);

                      if (!mounted) return;

                      navigator.pushReplacement(
                        MaterialPageRoute(builder: (_) => const AuthGate()),
                      );
                    } catch (e) {
                      if (!mounted) return;

                      final message = e.toString().toLowerCase();
                      if (message.contains('cancel') || message.contains('aborted')) {
                        return;
                      }

                      if (e is FirebaseAuthException &&
                          e.code == 'account-exists-with-different-credential') {
                        messenger?.showSnackBar(
                          const SnackBar(
                            content: Text(
                              'An account already exists for this email. Please sign in with the method you originally used, then link this one from Settings.',
                            ),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      messenger?.showSnackBar(
                        SnackBar(
                          content: Text(e.toString()),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  },
                  icon: const GoogleLogoIcon(size: 22),
                  label: Text(
                    _isUrdu ? 'گوگل کے ساتھ جاری رکھیں' : 'Continue with Google',
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
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => EmailAuthScreen(mode: widget.mode),
                      ),
                    );
                  },
                  icon: const Icon(Iconsax.sms, size: 24),
                  label: Text(
                    _isUrdu ? 'ای میل کے ساتھ جاری رکھیں' : 'Continue with Email',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}