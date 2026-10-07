import 'package:flutter/material.dart';
import '../../../core/design/app_design.dart';
import '../models/complaint_status.dart';

class ComplaintStatusBadge extends StatelessWidget {
  final ComplaintStatus status;
  const ComplaintStatusBadge({super.key, required this.status});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: status == ComplaintStatus.resolved
          ? Colors.green.shade50
          : AppDesign.greenSoft,
      borderRadius: BorderRadius.circular(30),
    ),
    child: Text(
      status.label,
      style: const TextStyle(
        color: AppDesign.greenDark,
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}
