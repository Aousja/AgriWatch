import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../home/home_screen.dart';
import '../profile/screens/profile_setup_screen.dart';
import '../profile/services/user_profile_service.dart';
import 'screens/welcome_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final UserProfileService _userProfileService = UserProfileService();
  bool _checking = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkAuthState();
  }

  Future<void> _checkAuthState() async {
    if (mounted) {
      setState(() {
        _checking = true;
        _errorMessage = null;
      });
    }

    final currentUser = FirebaseAuth.instance.currentUser;

    if (!mounted) return;

    if (currentUser == null) {
      setState(() => _checking = false);
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      );
      return;
    }

    try {
        final profile = await _userProfileService
            .fetchProfile(currentUser.uid)
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      setState(() => _checking = false);

      if (profile != null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
        return;
      }

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ProfileSetupScreen(user: currentUser)),
      );
    } on FirebaseException catch (e) {
      if (!mounted) return;

      setState(() {
        _checking = false;
        _errorMessage = e.code == 'permission-denied'
            ? 'Firestore denied access to your profile. Please check the Firestore security rules.'
            : 'We could not check your profile (${e.code}). Please check your internet connection and try again.';
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _checking = false;
        _errorMessage =
            'We could not check your profile. Please check your internet connection and try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: _checking
            ? const CircularProgressIndicator(color: Color(0xFF2E7D32))
            : _errorMessage != null
                ? Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Iconsax.cloud_cross,
                          size: 48,
                          color: Color(0xFF2E7D32),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton(
                          onPressed: _checkAuthState,
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
      ),
    );
  }
}
