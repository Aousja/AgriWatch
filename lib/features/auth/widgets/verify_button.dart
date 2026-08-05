import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';


class VerifyButton extends StatelessWidget {
  final bool loading;
  final bool enabled;
  final VoidCallback onPressed;

  const VerifyButton({
    super.key,
    required this.loading,
    required this.enabled,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF2E7D32);

    return SizedBox(
      width: double.infinity,
      height: 58,
      child: ElevatedButton(
        onPressed: enabled && !loading ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: green,
          disabledBackgroundColor: Colors.grey.shade300,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: loading
              ? SizedBox(
                  key: const ValueKey("loading"),
                  height: 34,
                  width: 34,
                  child: Lottie.asset(
                    "assets/animations/Loading in green.json",
                    repeat: true,
                  ),
                )
              : const Text(
                  "Verify",
                  key: ValueKey("text"),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
        ),
      ),
    );
  }
}