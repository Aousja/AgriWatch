import 'package:flutter/material.dart';
import 'otp_box.dart';
import 'package:flutter/services.dart';

class OTPInput extends StatefulWidget {
  final Function(String code) onChanged;

  const OTPInput({
    super.key,
    required this.onChanged,
  });

  @override
  State<OTPInput> createState() => _OTPInputState();
}

class _OTPInputState extends State<OTPInput> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  String code = "";

  @override
void initState() {
  super.initState();

  _controller.addListener(() {
    String value = _controller.text.replaceAll(RegExp(r'\D'), '');

    if (value.length > 6) {
      value = value.substring(0, 6);
    }

    if (value != code) {
      setState(() {
        code = value;
      });

      widget.onChanged(code);
    }
  });

  /// Automatically open keyboard after screen loads
 WidgetsBinding.instance.addPostFrameCallback((_) {
  Future.delayed(const Duration(milliseconds: 150), () {
    if (mounted) {
      _focusNode.requestFocus();
    }
  });
});
}
  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
  FocusScope.of(context).requestFocus(_focusNode);

  SystemChannels.textInput.invokeMethod('TextInput.show');
},
      child: Stack(
        alignment: Alignment.center,

        children: [

          /// Invisible TextField
          SizedBox(
  width: 0,
  height: 0,
  child: TextField(
    controller: _controller,
    focusNode: _focusNode,
    keyboardType: TextInputType.number,
    maxLength: 6,
    textInputAction: TextInputAction.done,
    enableSuggestions: false,
    autocorrect: false,
    inputFormatters: [
    FilteringTextInputFormatter.digitsOnly,
  ],
    decoration: const InputDecoration(
      counterText: "",
      border: InputBorder.none,
      isCollapsed: true,
      contentPadding: EdgeInsets.zero,
    ),
  ),
),


          /// OTP Boxes
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(
              6,
              (index) {
                String value = "";

                if (index < code.length) {
                  value = code[index];
                }

                return OTPBox(
                  value: value,
                  active: index == code.length,
                  filled: value.isNotEmpty,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}