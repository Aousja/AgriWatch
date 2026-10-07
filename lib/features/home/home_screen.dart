import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/design/app_design.dart';
import '../alerts/alerts_screen.dart';
import '../complaints/complaints_screen.dart';
import '../profile/models/user_profile.dart';

class HomeScreen extends StatelessWidget {
  final UserProfile? profile;

  const HomeScreen({super.key, this.profile});

  bool get _isFarmer => profile?.role == 'farmer';

  @override
  Widget build(BuildContext context) {
    final name = profile?.name?.trim();
    final greeting = AppCopy.text('Good morning', 'صبح بخیر');
    return SafeArea(
      child: ListView(
        padding: AppDesign.pagePadding.copyWith(top: 18, bottom: 28),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppDesign.ink,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      profile?.district?.isNotEmpty == true
                          ? profile!.district!
                          : AppCopy.text(
                              'Your local agricultural and drought information',
                              'آپ کے علاقے کی زرعی اور خشک سالی کی معلومات',
                            ),
                      style: const TextStyle(color: AppDesign.muted),
                    ),
                  ],
                ),
              ),
              CircleAvatar(
                radius: 24,
                backgroundColor: AppDesign.greenSoft,
                foregroundImage: profile?.photoUrl == null
                    ? null
                    : NetworkImage(profile!.photoUrl!),
                child: Text(
                  (name?.isNotEmpty == true ? name![0] : 'A').toUpperCase(),
                  style: const TextStyle(
                    color: AppDesign.green,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          AppSectionHeader(
            title: AppCopy.text('Local conditions', 'مقامی حالات'),
          ),
          const SizedBox(height: 10),
          const StatusCard(),
          const SizedBox(height: 28),
          AppSectionHeader(
            title: AppCopy.text('Quick actions', 'فوری اقدامات'),
          ),
          const SizedBox(height: 10),
          ActionTile(
            icon: Iconsax.activity,
            title: _isFarmer
                ? AppCopy.text('Crop advisory', 'فصل کا مشورہ')
                : AppCopy.text(
                    'Local drought information',
                    'مقامی خشک سالی کی معلومات',
                  ),
            subtitle: AppCopy.text(
              'Prepared for live insights',
              'لائیو معلومات کے لیے تیار',
            ),
            onTap: () => _comingSoon(context),
          ),
          const SizedBox(height: 10),
          ActionTile(
            icon: Iconsax.notification,
            title: AppCopy.text('View alerts', 'انتباہات دیکھیں'),
            subtitle: AppCopy.text(
              'Stay informed about your area',
              'اپنے علاقے سے باخبر رہیں',
            ),
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const AlertsScreen())),
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
        ],
      ),
    );
  }

  void _comingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          AppCopy.text(
            'This insight will be available when live monitoring is connected.',
            'لائیو نگرانی منسلک ہونے پر یہ معلومات دستیاب ہوں گی۔',
          ),
        ),
      ),
    );
  }
}
