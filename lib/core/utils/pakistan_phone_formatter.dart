import 'package:flutter/services.dart';

class PakistanPhoneFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Keep only digits
    String digits = newValue.text.replaceAll(RegExp(r'\D'), '');

    // Remove country code if pasted
    if (digits.startsWith('92')) {
      digits = digits.substring(2);
    }

    // Remove leading zero
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // Limit to 10 digits
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }

    String formatted = '';

    for (int i = 0; i < digits.length; i++) {
      if (i == 3) {
        formatted += ' ';
      }
      formatted += digits[i];
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(
        offset: formatted.length,
      ),
    );
  }
}