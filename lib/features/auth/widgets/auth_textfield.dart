import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';

import 'package:agriwatch/core/utils/pakistan_phone_formatter.dart';
import 'package:agriwatch/core/utils/phone_utils.dart';

class AuthTextField extends StatefulWidget {
  final TextEditingController controller;

  const AuthTextField({
    super.key,
    required this.controller,
  });

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode()..addListener(_handleFocusChange);
    widget.controller.addListener(_handleTextChange);
  }

  void _handleFocusChange() => setState(() {});

  void _handleTextChange() => setState(() {});

  @override
  void dispose() {
    widget.controller.removeListener(_handleTextChange);
    _focusNode
      ..removeListener(_handleFocusChange)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasText = widget.controller.text.isNotEmpty;
    final isValid = PhoneUtils.isValid(widget.controller.text);
    final isInvalid = hasText && !isValid;
    final borderColor = _focusNode.hasFocus
        ? const Color(0xFF2E7D32)
        : isValid
            ? const Color(0xFF66A86B)
            : isInvalid
                ? Colors.red.shade600
                : Colors.grey.shade300;

    return TextField(
      controller: widget.controller,
      focusNode: _focusNode,
      keyboardType: TextInputType.number,
      maxLength: 11,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        PakistanPhoneFormatter(),
      ],
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.grey.shade50,
        counterText: '',
        hintText: '300 1234567',
        prefixIcon: const Padding(
          padding: EdgeInsets.only(left: 16, right: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('🇵🇰', style: TextStyle(fontSize: 22)),
              SizedBox(width: 10),
              Text('+92', style: TextStyle(fontWeight: FontWeight.w600)),
              SizedBox(width: 12),
              SizedBox(height: 28, child: VerticalDivider(width: 1)),
            ],
          ),
        ),
        suffixIcon: isValid
            ? const Icon(Iconsax.tick_circle, color: Color(0xFF2E7D32))
            : isInvalid
              ? Icon(Iconsax.close_circle, color: Colors.red.shade600)
                : null,
        helperText: isInvalid ? 'Enter a valid 11-digit number' : null,
        helperStyle: TextStyle(color: Colors.red.shade700),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: borderColor, width: isValid || isInvalid ? 1.5 : 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: borderColor, width: 2),
        ),
      ),
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
    );
  }
}