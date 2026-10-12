import 'package:flutter/material.dart';
import '../../../core/design/app_design.dart';
import '../../../core/design/workflow_copy.dart';
import '../models/user_profile.dart';

/// A read error is never interpreted as a missing profile.
class ProfileReadView extends StatefulWidget {
  final Future<UserProfile?> future;
  final VoidCallback onRetry;
  final Widget Function(UserProfile) builder;

  const ProfileReadView({
    super.key,
    required this.future,
    required this.onRetry,
    required this.builder,
  });

  @override
  State<ProfileReadView> createState() => _ProfileReadViewState();
}

class _ProfileReadViewState extends State<ProfileReadView> {
  UserProfile? _lastProfile;

  @override
  Widget build(BuildContext context) => FutureBuilder<UserProfile?>(
    future: widget.future,
    builder: (context, snapshot) {
      final waiting = snapshot.connectionState != ConnectionState.done;
      final blocked = waiting || snapshot.hasError || snapshot.data == null;
      if (!blocked) _lastProfile = snapshot.data;
      // Keep tab state mounted during a token refresh or a failed profile read.
      // Block interaction until a successful read; stale data is never actionable.
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
          if (waiting)
            const Center(
              child: CircularProgressIndicator(color: AppDesign.green),
            )
          else if (blocked)
            Center(
              child: SingleChildScrollView(
                child: EmptyState(
                  icon: Icons.cloud_off,
                  title: WorkflowCopy.text('Profile unavailable'),
                  message: WorkflowCopy.text(
                    snapshot.hasError
                        ? 'We could not load your profile. Check your connection and retry.'
                        : 'Your profile could not be found. Retry to recover your account.',
                  ),
                  action: FilledButton(
                    onPressed: widget.onRetry,
                    child: Text(WorkflowCopy.text('Retry')),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}
