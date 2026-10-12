import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../../core/config/supabase_config.dart';
import '../../../core/design/app_design.dart';
import '../../../core/services/supabase_bridge.dart';
import '../../auth/screens/linked_sign_in_methods_screen.dart';
import '../../auth/screens/welcome_screen.dart';
import '../../auth/services/firebase_auth_service.dart';
import '../../language/language_screen.dart';
import '../../../core/services/local_storage_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: LocalStorageService.language,
      builder: (context, language, _) => Scaffold(
        appBar: AppBar(title: Text(AppCopy.text('Settings', 'ترتیبات'))),
        body: ListView(
          padding: AppDesign.pagePadding.copyWith(top: 12, bottom: 28),
          children: [
            if (kDebugMode && SupabaseConfig.isConfigured)
              _group(context, 'Bridge verification', [
                _item(
                  context,
                  Iconsax.refresh,
                  'Run isolated Supabase test',
                  () => _runBridgeTest(context),
                ),
              ]),
            _group(context, AppCopy.text('Account', 'اکاؤنٹ'), [
              if (const String.fromEnvironment(
                'IDENTITY_LINK_API_URL',
              ).isNotEmpty)
                _item(
                  context,
                  Iconsax.link_2,
                  AppCopy.text(
                    'Connect website account',
                    'ویب سائٹ اکاؤنٹ منسلک کریں',
                  ),
                  () => _showWebsiteLink(context),
                ),
              _item(
                context,
                Iconsax.link_2,
                AppCopy.text('Linked accounts', 'منسلک اکاؤنٹس'),
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const LinkedSignInMethodsScreen(),
                  ),
                ),
              ),
              _item(
                context,
                Iconsax.call,
                AppCopy.text('Change phone number', 'فون نمبر تبدیل کریں'),
                null,
              ),
            ]),
            _group(context, AppCopy.text('Preferences', 'ترجیحات'), [
              _item(
                context,
                Iconsax.language_square,
                AppCopy.text('Language', 'زبان'),
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        const LanguageScreen(returnToPrevious: true),
                  ),
                ),
              ),
              _item(
                context,
                Iconsax.notification,
                AppCopy.text('Notifications', 'اطلاعات'),
                null,
              ),
            ]),
            _group(context, AppCopy.text('Support', 'مدد'), [
              _item(
                context,
                Iconsax.message_question,
                AppCopy.text('Help', 'مدد'),
                null,
              ),
              _item(
                context,
                Iconsax.info_circle,
                AppCopy.text('About AgriWatch', 'ایگری واچ کے بارے میں'),
                null,
              ),
            ]),
            _group(context, AppCopy.text('Session', 'سیشن'), [
              _item(
                context,
                Iconsax.logout,
                AppCopy.text('Sign out', 'سائن آؤٹ'),
                () => _signOut(context),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _group(BuildContext context, String title, List<Widget> children) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 14, bottom: 6),
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                color: AppDesign.muted,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6,
              ),
            ),
          ),
          ...children,
        ],
      );

  Widget _item(
    BuildContext context,
    IconData icon,
    String title,
    VoidCallback? onTap,
  ) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon, color: AppDesign.green),
    title: Text(
      title,
      style: const TextStyle(fontWeight: FontWeight.w600, color: AppDesign.ink),
    ),
    subtitle: onTap == null
        ? Text(
            AppCopy.text('Unavailable in this app', 'اس ایپ میں دستیاب نہیں'),
          )
        : null,
    trailing: const Icon(Icons.chevron_right, color: AppDesign.muted),
    onTap:
        onTap ??
        () => ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              AppCopy.text(
                'This option is not available yet.',
                'یہ سہولت ابھی دستیاب نہیں۔',
              ),
            ),
          ),
        ),
  );

  Future<void> _showWebsiteLink(BuildContext context) async {
    final endpoint = Uri.parse(
      const String.fromEnvironment('IDENTITY_LINK_API_URL'),
    );
    final website = endpoint.replace(
      path: '/account-link',
      query: '',
      fragment: '',
    );
    await showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          AppCopy.text('Connect website account', 'ویب سائٹ اکاؤنٹ منسلک کریں'),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              AppCopy.text(
                'Complete your mobile profile first. Sign in to your existing website account, then verify this mobile account on the linking page. Email alone never links accounts. Staff approval stays separate.',
                'پہلے اپنا موبائل پروفائل مکمل کریں۔ اپنے موجودہ ویب اکاؤنٹ میں سائن ان کریں، پھر لنکنگ صفحے پر اس موبائل اکاؤنٹ کی تصدیق کریں۔ صرف ای میل سے اکاؤنٹ منسلک نہیں ہوتا۔ عملے کی منظوری الگ رہے گی۔',
              ),
            ),
            const SizedBox(height: 12),
            SelectableText(website.toString()),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(AppCopy.text('Close', 'بند کریں')),
          ),
        ],
      ),
    );
  }

  Future<void> _runBridgeTest(BuildContext context) async {
    try {
      final row = await SupabaseBridge.verifyIsolatedRoundTrip();
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Supabase bridge passed'),
          content: Text(
            'Inserted and read back row ${row['id']} for Firebase user ${row['owner_uid']}.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Supabase bridge blocked'),
          content: Text(error.toString()),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _signOut(BuildContext context) async {
    await FirebaseAuthService.instance.signOut();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      (_) => false,
    );
  }
}
