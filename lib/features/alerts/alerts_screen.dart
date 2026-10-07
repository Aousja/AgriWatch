import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/design/app_design.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: AppDesign.pagePadding.copyWith(top: 24, bottom: 32),
        children: [
          Text(AppCopy.text('Alerts', 'انتباہات'), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, color: AppDesign.ink)),
          const SizedBox(height: 20),
          SegmentedButton<int>(
            segments: [
              ButtonSegment(value: 0, label: Text(AppCopy.text('All', 'تمام'))),
              ButtonSegment(value: 1, label: Text(AppCopy.text('Important', 'اہم'))),
              ButtonSegment(value: 2, label: Text(AppCopy.text('Local', 'مقامی'))),
            ],
            selected: const {0},
            onSelectionChanged: (_) {},
          ),
          const SizedBox(height: 20),
          EmptyState(icon: Iconsax.notification_bing, title: AppCopy.text('No alerts yet', 'ابھی کوئی انتباہ نہیں'), message: AppCopy.text('Important drought and agricultural alerts for your area will appear here.', 'آپ کے علاقے کے اہم خشک سالی اور زرعی انتباہات یہاں ظاہر ہوں گے۔')),
        ],
      ),
    );
  }
}
