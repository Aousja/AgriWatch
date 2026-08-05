import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class ErrorAnimation extends StatelessWidget {
  const ErrorAnimation({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 180,
        height: 180,
        child: Lottie.asset(
          "assets/animations/Tomato Error.json",
          repeat: false,
        ),
      ),
    );
  }
}