import 'package:flutter/material.dart';

import '../../core/design/app_design.dart';
import '../profile/models/user_profile.dart';

/// Retains the mounted tabs during refresh, but blocks failed profile reads.
class ShellProfileView extends StatefulWidget {
  final Future<UserProfile?> future;
  final VoidCallback onRetry;
  final Widget Function(UserProfile) builder;

  const ShellProfileView({
    super.key,
    required this.future,
    required this.onRetry,
    required this.builder,
  });

  @override
  State<ShellProfileView> createState() => _ShellProfileViewState();
}

class _ShellProfileViewState extends State<ShellProfileView> {
  UserProfile? _lastProfile;
  bool _blocked = false;

  @override
  Widget build(BuildContext context) => FutureBuilder<UserProfile?>(
    future: widget.future,
    builder: (context, snapshot) {
      final waiting = snapshot.connectionState != ConnectionState.done;
      if (!waiting) _blocked = snapshot.hasError || snapshot.data == null;
      if (!waiting && !snapshot.hasError && snapshot.data != null) {
        _lastProfile = snapshot.data;
      }
      final blocked = _blocked;
      return Stack(
        fit: StackFit.expand,
        children: [
          if (_lastProfile != null)
            ExcludeFocus(
              excluding: blocked,
              child: Offstage(
                offstage: blocked,
                child: widget.builder(_lastProfile!),
              ),
            ),
          if (waiting && _lastProfile == null)
            const Center(
              child: CircularProgressIndicator(color: AppDesign.green),
            )
          else if (blocked)
            Center(
              child: SingleChildScrollView(
                child: EmptyState(
                  icon: Icons.cloud_off,
                  title: AppCopy.text(
                    'Profile unavailable',
                    'پروفائل دستیاب نہیں',
                  ),
                  message: snapshot.hasError
                      ? AppCopy.text(
                          'We could not load your profile. Check your connection and retry.',
                          'آپ کی پروفائل لوڈ نہیں ہو سکی۔ انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
                        )
                      : AppCopy.text(
                          'Your profile could not be found. Retry to recover your account.',
                          'آپ کی پروفائل نہیں ملی۔ اپنا اکاؤنٹ بحال کرنے کے لیے دوبارہ کوشش کریں۔',
                        ),
                  action: FilledButton(
                    onPressed: widget.onRetry,
                    child: Text(AppCopy.text('Retry', 'دوبارہ کوشش کریں')),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}
