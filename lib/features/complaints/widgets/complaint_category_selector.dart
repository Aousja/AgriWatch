import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import '../../../core/design/app_design.dart';
import '../models/report_categories.dart';

class ComplaintCategorySelector extends StatelessWidget {
  final String? selected;
  final ValueChanged<String?> onSelected;
  const ComplaintCategorySelector({
    super.key,
    required this.selected,
    required this.onSelected,
  });
  static final items = [
    (droughtReportCategories[0], Iconsax.drop),
    (droughtReportCategories[1], Iconsax.cloud_sunny),
    (droughtReportCategories[2], Iconsax.warning_2),
    (droughtReportCategories[3], Iconsax.more_circle),
  ];
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 8,
    runSpacing: 8,
    children: items
        .map(
          (item) => ChoiceChip(
            label: SizedBox(
              width: MediaQuery.sizeOf(context).width - 120,
              child: Text(item.$1, softWrap: true),
            ),
            avatar: Icon(item.$2, size: 17),
            selected: selected == item.$1,
            onSelected: (_) => onSelected(selected == item.$1 ? null : item.$1),
            selectedColor: AppDesign.greenSoft,
            side: const BorderSide(color: AppDesign.border),
            labelStyle: TextStyle(
              color: selected == item.$1 ? AppDesign.greenDark : AppDesign.ink,
              fontWeight: FontWeight.w600,
            ),
          ),
        )
        .toList(),
  );
}
