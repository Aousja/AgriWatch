import 'package:flutter/material.dart';

import '../widgets/auth_button.dart';
import '../widgets/auth_textfield.dart';
import 'otp_screen.dart';
import 'package:agriwatch/core/utils/phone_utils.dart';
import '../services/firebase_auth_service.dart';
import 'package:agriwatch/core/config/app_config.dart';



class PhoneScreen extends StatefulWidget {
  const PhoneScreen({super.key});

  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  final TextEditingController phoneController = TextEditingController();

bool isLoading = false;

  bool get isValid {
  return PhoneUtils.isValid(phoneController.text); }

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
          ),
        ),
      );
    },

    onVerificationCompleted: () {
      setState(() {
        isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Phone verified automatically."),
        ),
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
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => Navigator.pop(context),
        ),
      ),

      body: SafeArea(
  child: SingleChildScrollView(
    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
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
            MediaQuery.of(context).viewInsets.bottom + 25,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              Hero(
                tag: "app_logo",
                child: Center(
                  child: Image.asset(
                    "assets/images/AgriWatch logo.png",
                    width: 75,
                  ),
                ),
              ),

              const SizedBox(height: 35),

              const Text(
                "Enter Your\nPhone Number",
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),

              const SizedBox(height: 14),

              Text(
                "We'll send a verification code to your mobile number.",
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 16,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: 40),

              const Text(
                "Mobile Number",
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
                    Icons.info_outline,
                    size: 18,
                    color: green,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Only Pakistani mobile numbers are currently supported.",
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),

              

              AuthButton(
  text: isLoading ? "Sending..." : "Continue",
  onPressed: isValid && !isLoading
      ? sendOTP
      : null,
),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    ),
  ),
),
    );
  }
}