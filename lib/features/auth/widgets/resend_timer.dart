import 'dart:async';
import 'package:flutter/material.dart';

class ResendTimer extends StatefulWidget {
  final int duration;
  final VoidCallback onResend;

  const ResendTimer({
    super.key,
    this.duration = 60,
    required this.onResend,
  });

  @override
  State<ResendTimer> createState() => _ResendTimerState();
}

class _ResendTimerState extends State<ResendTimer> {
  late int seconds;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    startTimer();
  }

  void startTimer() {
    timer?.cancel();

    seconds = widget.duration;

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

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  String get formatted {
    return "00:${seconds.toString().padLeft(2, '0')}";
  }

@override
Widget build(BuildContext context) {
  const green = Color(0xFF2E7D32);

  if (seconds == 0) {
    return Column(
      children: [
        Text(
          "Didn't receive the code?",
          style: TextStyle(
            color: Colors.grey.shade700,
            fontSize: 15,
          ),
        ),

        const SizedBox(height: 10),

        TextButton(
          onPressed: () {
            widget.onResend();
            startTimer();
          },
          style: TextButton.styleFrom(
            foregroundColor: green,
          ),
          child: const Text(
            "Resend Code",
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
      ],
    );
  }

  return Column(
    children: [
      SizedBox(
        width: 82,
        height: 82,
        child: Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: CircularProgressIndicator(
                value: seconds / widget.duration,
                strokeWidth: 5,
                strokeCap: StrokeCap.round,
                backgroundColor: Colors.grey.shade200,
                valueColor:
                    const AlwaysStoppedAnimation(green),
              ),
            ),

            Text(
              formatted,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: green,
              ),
            ),
          ],
        ),
      ),

      const SizedBox(height: 22),

      Text(
        "Didn't receive the code?",
        style: TextStyle(
          color: Colors.grey.shade700,
          fontSize: 15,
        ),
      ),
    ],
  );
}
}