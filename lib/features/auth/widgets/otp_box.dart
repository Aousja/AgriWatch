import 'package:flutter/material.dart';

class OTPBox extends StatelessWidget {
  final String value;
  final bool active;
  final bool filled;

  const OTPBox({
    super.key,
    required this.value,
    required this.active,
    required this.filled,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: filled ? 1 : 0.92,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutBack,

      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),

        width: 52,
        height: 64,

        decoration: BoxDecoration(
          color: filled
              ? const Color(0xffE8F5E9)
              : Colors.white,

          borderRadius: BorderRadius.circular(18),

          border: Border.all(
            color: active
                ? const Color(0xff2E7D32)
                : Colors.grey.shade300,
            width: active ? 2.3 : 1.4,
          ),

          boxShadow: [
            if (active)
              BoxShadow(
                color: Colors.green.withValues(alpha: .18),
                blurRadius: 14,
                offset: const Offset(0, 5),
              ),
          ],
        ),

        child: Center(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 150),

            transitionBuilder: (child, animation) {
              return ScaleTransition(
                scale: animation,
                child: FadeTransition(
                  opacity: animation,
                  child: child,
                ),
              );
            },

            child: Text(
              value,
              key: ValueKey(value),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ),
    );
  }
}