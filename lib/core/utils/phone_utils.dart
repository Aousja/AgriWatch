class PhoneUtils {
  static String normalize(String input) {
    String digits = input.replaceAll(RegExp(r'\D'), '');

    if (digits.startsWith('92')) {
      digits = digits.substring(2);
    }

    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    return digits;
  }

  static String firebaseNumber(String input) {
    return "+92${normalize(input)}";
  }

  static bool isValid(String input) {
    return normalize(input).length == 10;
  }
}