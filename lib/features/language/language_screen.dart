import 'package:flutter/material.dart';

import '../../core/services/local_storage_service.dart';
import '../auth/screens/welcome_screen.dart';

class LanguageScreen extends StatefulWidget {
  const LanguageScreen({super.key});

  @override
  State<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends State<LanguageScreen> {
  String? selectedLanguage;

  Future<void> _continue() async {
    if (selectedLanguage == null) return;

    await LocalStorageService.setLanguage(selectedLanguage!);

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => const WelcomeScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF2E7D32);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),

              // AgriWatch Logo
              Image.asset(
                "assets/images/AgriWatch logo.png",
                width: 130,
                height: 130,
              ),

              const SizedBox(height: 25),

              const Text(
                "Choose Your Language\nاپنی زبان منتخب کریں",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  height: 1.35,
                ),
              ),

              const SizedBox(height: 12),

              Text(
                "Continue in your preferred language.\nاپنی پسندیدہ زبان میں جاری رکھیں۔",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey.shade600,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: 50),

              _languageCard(
                title: "English",
                subtitle: "Continue in English",
                languageCode: "en",
              ),

              const SizedBox(height: 18),

              _languageCard(
                title: "اردو",
                subtitle: "اردو میں جاری رکھیں",
                languageCode: "ur",
              ),

              const Spacer(),

              SizedBox(
                width: double.infinity,
                height: 58,
                child: ElevatedButton(
                  onPressed:
                      selectedLanguage == null ? null : _continue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: green,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: const Text(
                    "Continue | جاری رکھیں",
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 25),
            ],
          ),
        ),
      ),
    );
  }

  Widget _languageCard({
    required String title,
    required String subtitle,
    required String languageCode,
  }) {
    final selected = selectedLanguage == languageCode;

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () {
        setState(() {
          selectedLanguage = languageCode;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 18,
        ),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFFE8F5E9)
              : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected
                ? const Color(0xFF2E7D32)
                : Colors.grey.shade300,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 21,
                      fontWeight: selected
                          ? FontWeight.bold
                          : FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: selected
                  ? const Icon(
                      Icons.check_circle,
                      key: ValueKey("selected"),
                      color: Color(0xFF2E7D32),
                      size: 30,
                    )
                  : const SizedBox(
                      key: ValueKey("unselected"),
                      width: 30,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}