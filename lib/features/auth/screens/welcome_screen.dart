import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../../core/services/local_storage_service.dart';
import 'phone_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;
  bool? _isReturningUser;

  bool get _isUrdu => LocalStorageService.getLanguage() == 'ur';

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _continue() {
    if (_isReturningUser == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PhoneScreen(
          mode: _isReturningUser! ? 'signIn' : 'signUp',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF2E7D32);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
          child: Column(
            children: [
              Image.asset(
                'assets/images/Agriwatch logo.png',
                width: 118,
              ),
              const SizedBox(height: 18),
              FadeTransition(
                opacity: _fade,
                child: Column(
                  children: [
                    Text(
                      _isUrdu ? 'AgriWatch میں خوش آمدید' : 'Welcome to AgriWatch',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF17351D),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _isUrdu
                          ? 'بہتر کاشت اور محفوظ معاشروں کے لیے ذہین معلومات۔'
                          : 'Smart insights for healthier farming and safer communities.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.4,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
              SlideTransition(
                position: _slide,
                child: Column(
                  children: [
                    Align(
                      alignment: _isUrdu
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Text(
                        _isUrdu
                            ? 'کیا آپ نے پہلے AgriWatch استعمال کیا ہے؟'
                            : 'Have you used AgriWatch before?',
                        textAlign: _isUrdu ? TextAlign.right : TextAlign.left,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    _journeyChoice(
                      isReturningUser: true,
                      icon: Iconsax.login,
                      title: _isUrdu
                          ? 'میرا اکاؤنٹ پہلے سے موجود ہے'
                          : 'I already have an account',
                      subtitle: _isUrdu
                          ? 'جاری رکھنے کے لیے سائن اِن کریں'
                          : 'Sign in to continue',
                    ),
                    const SizedBox(height: 12),
                    _journeyChoice(
                      isReturningUser: false,
                      icon: Iconsax.user_add,
                      title: _isUrdu
                          ? 'میں AgriWatch کے لیے نیا ہوں'
                          : "I'm new to AgriWatch",
                      subtitle: _isUrdu ? 'اپنا اکاؤنٹ بنائیں' : 'Create my account',
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton.icon(
                        onPressed: _isReturningUser == null ? null : _continue,
                        icon: const Icon(Iconsax.arrow_right),
                        label: Text(
                          _isUrdu ? 'جاری رکھیں' : 'Continue',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: green,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: Colors.grey.shade300,
                          disabledForegroundColor: Colors.grey.shade600,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _journeyChoice({
    required bool isReturningUser,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    const green = Color(0xFF2E7D32);
    final selected = _isReturningUser == isReturningUser;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => setState(() => _isReturningUser = isReturningUser),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE8F5E9) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? green : const Color(0xFFDCE9DF),
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: green, size: 28),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                ],
              ),
            ),
            Icon(
              selected ? Iconsax.tick_circle : Iconsax.record_circle,
              color: selected ? green : Colors.grey.shade500,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
