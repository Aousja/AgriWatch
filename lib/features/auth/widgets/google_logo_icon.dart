import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class GoogleLogoIcon extends StatelessWidget {
  final double size;

  const GoogleLogoIcon({
    super.key,
    this.size = 24,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: SvgPicture.asset('assets/images/google_logo.svg'),
    );
  }
}

