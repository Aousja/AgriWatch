import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/design/app_design.dart';
import '../models/complaint.dart';

class ComplaintTimeline extends StatelessWidget {
  final List<ComplaintEvent> events;
  const ComplaintTimeline({super.key, required this.events});
  @override
  Widget build(BuildContext context) => Column(
    children: events.asMap().entries.map((entry) {
      final event = entry.value;
      final last = entry.key == events.length - 1;
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 34,
            child: Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: event.isCurrent
                        ? AppDesign.green
                        : event.date != null
                        ? AppDesign.greenSoft
                        : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: event.date != null || event.isCurrent
                          ? AppDesign.green
                          : AppDesign.border,
                    ),
                  ),
                  child: Icon(
                    event.isCurrent
                        ? Icons.radio_button_checked
                        : event.date != null
                        ? Icons.check
                        : Icons.schedule,
                    size: 16,
                    color: event.isCurrent
                        ? Colors.white
                        : event.date != null
                        ? AppDesign.green
                        : AppDesign.muted,
                  ),
                ),
                if (!last)
                  Container(
                    width: 2,
                    height: 62,
                    color: event.date != null
                        ? AppDesign.greenSoft
                        : AppDesign.border,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: TextStyle(
                      color: AppDesign.ink,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    event.description,
                    style: const TextStyle(color: AppDesign.muted, height: 1.3),
                  ),
                  if (event.date != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 5),
                      child: Text(
                        DateFormat('dd MMM yyyy, hh:mm a').format(event.date!),
                        style: const TextStyle(
                          color: AppDesign.green,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      );
    }).toList(),
  );
}
