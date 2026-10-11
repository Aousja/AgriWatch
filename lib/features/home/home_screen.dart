import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/design/app_design.dart';
import '../advisory/advisory_screen.dart';
import '../complaints/complaints_screen.dart';
import '../profile/models/user_profile.dart';

class HomeScreen extends StatelessWidget {
  final UserProfile? profile;

  const HomeScreen({super.key, this.profile});

  static String greetingFor(DateTime time) {
    final hour = time.toLocal().hour;
    if (hour >= 5 && hour < 12) {
      return AppCopy.text('Good morning', 'صبح بخیر');
    }
    if (hour >= 12 && hour < 17) {
      return AppCopy.text('Good afternoon', 'سہ پہر بخیر');
    }
    if (hour >= 17 && hour < 21) {
      return AppCopy.text('Good evening', 'شام بخیر');
    }
    return AppCopy.text('Hello', 'السلام علیکم');
  }

  @override
  Widget build(BuildContext context) {
    final name = profile?.name?.trim();
    final greeting = greetingFor(DateTime.now());
    return SafeArea(
      child: ListView(
        padding: AppDesign.pagePadding.copyWith(top: 18, bottom: 28),
        children: [
          Text(
            'AgriWatch',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: AppDesign.greenDark,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            '$greeting${name == null || name.isEmpty ? '' : ', $name'}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppDesign.ink,
            ),
          ),
          if (profile?.district?.trim().isNotEmpty == true) ...[
            const SizedBox(height: 6),
            Text(
              profile!.district!,
              style: const TextStyle(color: AppDesign.muted),
            ),
          ],
          const SizedBox(height: 28),
          AppSectionHeader(
            title: AppCopy.text('Quick actions', 'فوری اقدامات'),
          ),
          const SizedBox(height: 10),
          ActionTile(
            icon: Iconsax.activity,
            title: AppCopy.text('Farming Advisory', 'زرعی مشورہ'),
            subtitle: AppCopy.text(
              'Ask about crops, soil, irrigation, and pests',
              'فصلوں، مٹی، آبپاشی اور کیڑوں کے بارے میں پوچھیں',
            ),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                settings: const RouteSettings(name: 'farmer-advisory'),
                builder: (_) => const AdvisoryScreen(),
              ),
            ),
          ),
          const SizedBox(height: 10),
          ActionTile(
            icon: Iconsax.warning_2,
            title: AppCopy.text(
              'Report Drought Situation',
              'خشک سالی کی صورتحال رپورٹ کریں',
            ),
            subtitle: AppCopy.text(
              'Submit to AgriWatch admin review',
              'ایگری واچ ایڈمن کے جائزے کے لیے جمع کریں',
            ),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ComplaintsScreen(profile: profile),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 18, color: AppDesign.muted),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  AppCopy.text(
                    'Local monitoring unavailable. Live data is not connected yet.',
                    'مقامی نگرانی دستیاب نہیں۔ لائیو معلومات ابھی منسلک نہیں ہیں۔',
                  ),
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: AppDesign.muted),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
