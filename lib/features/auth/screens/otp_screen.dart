import 'dart:async';

import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import 'package:agriwatch/features/auth/widgets/auth_button.dart';
import 'package:agriwatch/features/auth/widgets/otp_input.dart';
import 'package:agriwatch/features/auth/widgets/resend_timer.dart';
import '../services/firebase_auth_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:lottie/lottie.dart';
import 'package:agriwatch/core/config/app_config.dart';
import '../auth_gate.dart';




class OTPScreen extends StatefulWidget {
  final String phoneNumber;
  final String verificationId;
  final String mode;

  const OTPScreen({
    super.key,
    required this.phoneNumber,
    required this.verificationId,
    this.mode = 'signIn',
  });

  

  @override
  State<OTPScreen> createState() => _OTPScreenState();
}


class _OTPScreenState extends State<OTPScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  late Animation<double> _fade;

  late Animation<Offset> _slide;

  String otp = "";

  int seconds = 60;

  Timer? timer;

  bool isLoading = false;
  bool showSuccess = false;
  bool showError = false;


  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _fade = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    );

    _slide = Tween(
      begin: const Offset(0, .15),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOut,
      ),
    );

    _controller.forward();

    startTimer();
  }

  void startTimer() {
    timer?.cancel();

    seconds = 60;

    timer = Timer.periodic(
      const Duration(seconds: 1),
      (t) {
        if (seconds == 0) {
          t.cancel();
        } else {
          setState(() {
            seconds--;
          });
        }
      },
    );
  }


  Future<void> verifyOTP() async {

// ==========================
// DEVELOPMENT MODE
// ==========================
if (!AppConfig.useFirebaseOTP) {
  if (otp.length != 6) return;

  setState(() {
    showSuccess = true;
  });

  await Future.delayed(const Duration(seconds: 2));

  if (!mounted) return;

  setState(() {
    showSuccess = false;
  });

  try {
    await FirebaseAuth.instance.signInAnonymously();

    if (!mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const AuthGate()),
      (route) => false,
    );
  } on FirebaseAuthException catch (e) {
    if (!mounted) return;

    setState(() {
      showError = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          e.message ?? 'Enable Anonymous sign-in in Firebase for development mode.',
        ),
        backgroundColor: Colors.red,
      ),
    );
  }
  return;
}

// For Firebase mode, proceed with actual verification
  setState(() {
    isLoading = true;
  });


  try {
    final credential = await FirebaseAuthService.instance.verifyOTP(
      verificationId: widget.verificationId,
      smsCode: otp,
    );

    final isNewUser = credential?.additionalUserInfo?.isNewUser ?? false;

    if (widget.mode == 'signIn' && isNewUser) {
      await FirebaseAuth.instance.currentUser?.delete();
      await FirebaseAuth.instance.signOut();
      throw FirebaseAuthException(
        code: 'user-not-found',
        message: 'No account found for this phone number. Please sign up first.',
      );
    }

    if (widget.mode == 'signUp' && !isNewUser) {
      await FirebaseAuth.instance.signOut();
      throw FirebaseAuthException(
        code: 'account-exists',
        message: 'This phone account already exists. Please sign in instead.',
      );
    }

    if (!mounted) return;

    setState(() {
      isLoading = false;
      showSuccess = true;
    });

    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    setState(() {
      showSuccess = false;
    });

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const AuthGate()),
      (route) => false,
    );
  } on FirebaseAuthException catch (e) {
    if (!mounted) return;

    setState(() {
      isLoading = false;
      showError = true;
    });

    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    setState(() {
      showError = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(e.message ?? "Invalid OTP"),
        backgroundColor: Colors.red,
      ),
    );
  } catch (e) {
    if (!mounted) return;

    setState(() {
      isLoading = false;
      showError = true;
    });

    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    setState(() {
      showError = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(e.toString()),
        backgroundColor: Colors.red,
      ),
    );
  }
}

  @override
  void dispose() {
    timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  String formatTime() {
    return "00:${seconds.toString().padLeft(2, '0')}";
  }

  @override
  Widget build(BuildContext context) {
    //const green = Color(0xff2E7D32);

    return Scaffold(
  resizeToAvoidBottomInset: true,
  backgroundColor: Colors.white,

  appBar: AppBar(
    backgroundColor: Colors.white,
    scrolledUnderElevation: 0,
    elevation: 0,
    leading: IconButton(
      icon: const Icon(Iconsax.arrow_left),
      onPressed: () => Navigator.pop(context),
    ),
  ),

  body: Stack(
    children: [

      SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior:
              ScrollViewKeyboardDismissBehavior.onDrag,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight:
                  MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top,
            ),
            child: IntrinsicHeight(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  28,
                  0,
                  28,
                  MediaQuery.of(context).viewInsets.bottom + 20,
                ),
                child: FadeTransition(
                  opacity: _fade,
                  child: SlideTransition(
                    position: _slide,
                    child: Column(
                      children: [

                        Hero(
                          tag: "app_logo",
                          child: Image.asset(
                            "assets/images/Agriwatch logo.png",
                            width: 80,
                          ),
                        ),

                        const SizedBox(height: 30),

                        const Text(
                          "Verify Phone Number",
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.bold,
                          ),
                        ),

                        const SizedBox(height: 12),

                        Text(
                          "Enter the 6-digit verification code sent to",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                          ),
                        ),

                        const SizedBox(height: 8),

                        Text(
                          widget.phoneNumber,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),

                        const SizedBox(height: 30),

                        OTPInput(
                          onChanged: (value) {
                            setState(() {
                              otp = value;
                            });
                          },
                        ),

                        const SizedBox(height: 25),

                        ResendTimer(
                          onResend: () {
                            // Firebase resend OTP
                          },
                        ),

                        const SizedBox(height: 40),

                        AuthButton(
                          text: "Verify",
                          onPressed:
                              otp.length == 6 ? verifyOTP : null,
                        ),

                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

      /// Loading Overlay
      if (isLoading)
        Container(
          color: Colors.white.withValues(alpha: 0.95),
          child: Center(
            child: SizedBox(
              width: 120,
              height: 120,
              child: Lottie.asset(
                "assets/animations/Loading in green.json",
              ),
            ),
          ),
        ),

      /// Success Overlay
      if (showSuccess)
        Container(
          color: Colors.white,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  "assets/images/Agriwatch logo.png",
                  width: 90,
                ),

                const SizedBox(height: 20),

                SizedBox(
                  width: 180,
                  height: 180,
                  child: Lottie.asset(
                    "assets/animations/check.json",
                    repeat: false,
                  ),
                ),

                const SizedBox(height: 20),

                const Text(
                  "Phone Verified",
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 8),

                const Text("Welcome to AgriWatch"),
              ],
            ),
          ),
        ),

      /// Error Overlay
      if (showError)
        Container(
          color: Colors.white.withValues(alpha: 0.95),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 180,
                  height: 180,
                  child: Lottie.asset(
                    "assets/animations/Tomato Error.json",
                    repeat: false,
                  ),
                ),

                const SizedBox(height: 20),

                const Text(
                  "Invalid OTP",
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                  ),
                ),

                const SizedBox(height: 8),

                const Text("Please try again"),
              ],
            ),
          ),
        ),
    ],
  ),
);
  }
}
    

