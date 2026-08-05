import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:agriwatch/core/utils/pakistan_phone_formatter.dart';

class AuthTextField extends StatelessWidget {
  final TextEditingController controller;

  const AuthTextField({
    super.key,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 65,
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Colors.grey.shade300,
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          const SizedBox(width: 18),

          const Text(
            "🇵🇰",
            style: TextStyle(fontSize: 24),
          ),

          const SizedBox(width: 12),

          const Text(
            "+92",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),

          const SizedBox(width: 14),

          Container(
            width: 1.5,
            height: 30,
            color: Colors.grey.shade300,
          ),

          const SizedBox(width: 16),

          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              maxLength: 11,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                PakistanPhoneFormatter(),
              ],
              decoration: const InputDecoration(
                border: InputBorder.none,
                counterText: "",
                hintText: "300 1234567",
              ),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}