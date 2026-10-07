import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/design/app_design.dart';
import '../models/complaint.dart';
import 'complaint_status_badge.dart';

class ComplaintCard extends StatelessWidget {
  final Complaint complaint;
  final String district;
  final VoidCallback onTap;
  const ComplaintCard({
    super.key,
    required this.complaint,
    required this.district,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Card(
    margin: EdgeInsets.zero,
    elevation: 0,
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: AppDesign.border),
    ),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 10,
              height: 10,
              margin: const EdgeInsets.only(top: 5),
              decoration: const BoxDecoration(
                color: AppDesign.green,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    complaint.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppDesign.ink,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${complaint.ticketId}  •  ${DateFormat('dd MMM yyyy').format(complaint.createdAt)}',
                    style: const TextStyle(
                      color: AppDesign.muted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ComplaintStatusBadge(status: complaint.status),
                      Text(
                        district,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppDesign.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppDesign.muted),
          ],
        ),
      ),
    ),
  );
}
