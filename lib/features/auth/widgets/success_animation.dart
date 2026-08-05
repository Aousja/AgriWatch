import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class SuccessAnimation extends StatelessWidget {
  const SuccessAnimation({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 180,
        height: 180,
        child: Lottie.asset(
          "assets/animations/check.json",
          repeat: false,
        ),
      ),
    );
  }
}