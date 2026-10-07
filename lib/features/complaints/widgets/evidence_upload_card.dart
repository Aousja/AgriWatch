import 'dart:io';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';
import '../../../core/design/app_design.dart';

class EvidenceUploadCard extends StatelessWidget {
  final String? path;
  final VoidCallback onTap, onRemove;
  const EvidenceUploadCard({
    super.key,
    required this.path,
    required this.onTap,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      height: 150,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppDesign.border),
      ),
      child: path == null
          ? const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Iconsax.camera, color: AppDesign.green, size: 30),
                SizedBox(height: 8),
                Text(
                  'Capture or Upload',
                  style: TextStyle(
                    color: AppDesign.ink,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Add a photo to help us understand the issue',
                  style: TextStyle(color: AppDesign.muted, fontSize: 12),
                ),
              ],
            )
          : Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: Image.file(
                    File(path!),
                    fit: BoxFit.cover,
                    errorBuilder: (_, error, stackTrace) => Container(
                      color: AppDesign.greenSoft,
                      child: const Icon(
                        Iconsax.image,
                        size: 38,
                        color: AppDesign.green,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton.filled(
                    onPressed: onRemove,
                    icon: const Icon(Icons.close),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppDesign.ink,
                    ),
                  ),
                ),
              ],
            ),
    ),
  );
}
