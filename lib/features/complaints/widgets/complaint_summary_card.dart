import 'package:flutter/material.dart';
import '../../../core/design/app_design.dart';

class ComplaintSummaryCard extends StatelessWidget {
  final int active, attention;
  const ComplaintSummaryCard({
    super.key,
    required this.active,
    required this.attention,
  });

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: AppDesign.greenDark,
      borderRadius: BorderRadius.circular(AppDesign.radius),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .14),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.track_changes, color: Colors.white),
            ),
            const Spacer(),
            const Icon(Icons.eco_outlined, color: Colors.white70, size: 30),
          ],
        ),
        const SizedBox(height: 16),
        const Text(
          'Active drought reports',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 5),
        const Text(
          'Track recorded updates to your reports.',
          style: TextStyle(color: Colors.white70),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            _stat('$active', 'Total active'),
            const SizedBox(width: 30),
            _stat('$attention', 'Need attention'),
          ],
        ),
      ],
    ),
  );

  Widget _stat(String value, String label) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        value,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 25,
          fontWeight: FontWeight.w800,
        ),
      ),
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
    ],
  );
}
