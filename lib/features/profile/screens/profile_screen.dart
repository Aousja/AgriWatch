import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../../core/design/app_design.dart';
import '../../auth/screens/linked_sign_in_methods_screen.dart';
import '../../auth/screens/welcome_screen.dart';
import '../../language/language_screen.dart';
import 'access_request_screen.dart';
import '../models/user_profile.dart';
import 'settings_screen.dart';

class ProfileScreen extends StatefulWidget {
  final UserProfile? profile;
  final VoidCallback? onProfileUpdated;

  const ProfileScreen({super.key, this.profile, this.onProfileUpdated});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _notificationsEnabled = true;

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final displayName = _valueOr(widget.profile?.name, 'AgriWatch user');
    final contact = _firstAvailable([
      widget.profile?.phoneNumber,
      widget.profile?.email,
      user?.phoneNumber,
      user?.email,
    ], fallback: 'Not provided');
    final contactLabel = _hasValue(widget.profile?.phoneNumber) ||
            _hasValue(user?.phoneNumber)
        ? 'Mobile number'
        : 'Email';
    final district = _valueOr(widget.profile?.district, 'District not set');
    final role = switch (widget.profile?.role) {
      'farmer' => 'Farmer',
      'pdma_officer' => 'PDMA Officer',
      'admin' => 'Administrator',
      _ => 'Citizen',
    };

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          _profileHeader(
            context,
            displayName: displayName,
            role: role,
            district: district,
          ),
          Padding(
            padding: AppDesign.pagePadding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 22),
                _sectionTitle('Personal Information'),
                const SizedBox(height: 9),
                _personalInformationCard(
                  contactLabel: contactLabel,
                  contact: contact,
                  district: district,
                ),
                const SizedBox(height: 24),
                _sectionTitle('Settings & Account'),
                const SizedBox(height: 9),
                _settingsCard(context),
                const SizedBox(height: 24),
                _sectionTitle('Help Center & Support'),
                const SizedBox(height: 9),
                _listSurface([
                  _accountRow(
                    context,
                    icon: Iconsax.message_question,
                    title: 'Help & FAQ',
                  ),
                  _accountRow(
                    context,
                    icon: Iconsax.share,
                    title: 'Refer a Farmer',
                  ),
                  _accountRow(
                    context,
                    icon: Iconsax.info_circle,
                    title: 'About AgriWatch',
                  ),
                ]),
                const SizedBox(height: 24),
                _logoutRow(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileHeader(
    BuildContext context, {
    required String displayName,
    required String role,
    required String district,
  }) {
    final photoUrl = widget.profile?.photoUrl?.trim();

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppDesign.greenDark, AppDesign.green],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: Colors.white,
            foregroundImage: photoUrl == null || photoUrl.isEmpty
                ? null
                : NetworkImage(photoUrl),
            child: Text(
              _initials(displayName),
              style: const TextStyle(
                color: AppDesign.greenDark,
                fontSize: 25,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        displayName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => _showUnavailable(context),
                      tooltip: 'Edit profile',
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints.tightFor(
                        width: 40,
                        height: 40,
                      ),
                      icon: Icon(
                        Iconsax.edit_2,
                        color: Colors.white.withValues(alpha: 0.76),
                        size: 18,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  role,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  district,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _personalInformationCard({
    required String contactLabel,
    required String contact,
    required String district,
  }) {
    return _card([
      _informationRow(
        icon: Iconsax.call,
        label: contactLabel,
        value: contact,
      ),
      _informationRow(
        icon: Iconsax.location,
        label: 'District & region',
        value: district,
      ),
    ]);
  }

  Widget _informationRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            child: Icon(icon, color: AppDesign.greenDark, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppDesign.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppDesign.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _accountRow(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    VoidCallback? onTap,
    Widget? trailing,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      minVerticalPadding: 7,
      horizontalTitleGap: 10,
      minLeadingWidth: 28,
      leading: SizedBox(
        width: 28,
        height: 28,
        child: Icon(icon, color: AppDesign.greenDark, size: 19),
      ),
      title: Text(
        title,
        style: const TextStyle(
          color: AppDesign.ink,
          fontSize: 15.5,
          fontWeight: FontWeight.w600,
        ),
      ),
      subtitle: subtitle == null
          ? null
          : Text(
              subtitle,
              style: const TextStyle(color: AppDesign.muted, fontSize: 12),
            ),
      trailing: trailing ??
          const Icon(Icons.chevron_right, color: AppDesign.muted),
      onTap: onTap ?? () => _showUnavailable(context),
    );
  }

  Widget _logoutRow(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppDesign.radius),
      child: InkWell(
        onTap: () => _signOut(context),
        borderRadius: BorderRadius.circular(AppDesign.radius),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.red.shade100),
          ),
          child: Row(
            children: [
              Icon(
                Iconsax.logout,
                color: Colors.red.shade700,
                size: 20,
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Sign out',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.red.shade300),
            ],
          ),
        ),
      ),
    );
  }

  Widget _card(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppDesign.border),
      ),
      child: Column(children: _withDividers(children, indent: 52)),
    );
  }

  Widget _listSurface(List<Widget> children) {
    return Container(
      color: Colors.white,
      child: Column(children: _withDividers(children, indent: 40)),
    );
  }

  Widget _settingsCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppDesign.border),
          bottom: BorderSide(color: AppDesign.border),
        ),
      ),
      child: Column(
        children: [
          _settingsGroupLabel('Account'),
          _accountRow(
            context,
            icon: Iconsax.user_edit,
            title: 'Personal information',
          ),
          _accountRow(
            context,
            icon: Iconsax.call,
            title: 'Change phone number',
          ),
          _accountRow(
            context,
            icon: Iconsax.link_2,
            title: 'Linked Sign-In Methods',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const LinkedSignInMethodsScreen(),
              ),
            ),
          ),
          _settingsDivider(),
          _settingsGroupLabel('Access'),
          _accountRow(
            context,
            icon: Iconsax.shield_tick,
            title: 'Request Officer/Organization Access',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const AccessRequestScreen(),
              ),
            ),
          ),
          _settingsDivider(),
          _settingsGroupLabel('Preferences'),
          _accountRow(
            context,
            icon: Iconsax.language_square,
            title: 'App Language',
            trailing: _valueTrailing(AppCopy.isUrdu ? 'Urdu' : 'English'),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const LanguageScreen(),
              ),
            ),
          ),
          _accountRow(
            context,
            icon: Iconsax.notification,
            title: 'Notifications',
            trailing: Switch.adaptive(
              value: _notificationsEnabled,
              onChanged: (value) =>
                  setState(() => _notificationsEnabled = value),
            ),
            onTap: () => setState(
              () => _notificationsEnabled = !_notificationsEnabled,
            ),
          ),
          _settingsDivider(),
          _settingsGroupLabel('Security'),
          _accountRow(
            context,
            icon: Iconsax.security_safe,
            title: 'Privacy & Security',
          ),
          _accountRow(
            context,
            icon: Iconsax.setting_2,
            title: 'Settings',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const SettingsScreen(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _settingsGroupLabel(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 3),
        child: Text(
          title.toUpperCase(),
          style: const TextStyle(
          color: AppDesign.muted,
          fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.7,
          ),
        ),
      ),
    );
  }

  Widget _settingsDivider() {
    return const Divider(height: 1, indent: 16, endIndent: 16);
  }

  Widget _valueTrailing(String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: AppDesign.greenDark,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(width: 8),
        const Icon(Icons.chevron_right, color: AppDesign.muted),
      ],
    );
  }

  List<Widget> _withDividers(
    List<Widget> children, {
    required double indent,
  }) {
    final items = <Widget>[];
    for (var index = 0; index < children.length; index++) {
      if (index > 0) {
        items.add(Divider(height: 1, indent: indent, endIndent: 16));
      }
      items.add(children[index]);
    }
    return items;
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        color: AppDesign.ink,
        fontSize: 17,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  String _valueOr(String? value, String fallback) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? fallback : trimmed;
  }

  bool _hasValue(String? value) {
    final trimmed = value?.trim();
    return trimmed != null && trimmed.isNotEmpty;
  }

  String _firstAvailable(List<String?> values, {required String fallback}) {
    for (final value in values) {
      final trimmed = value?.trim();
      if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    }
    return fallback;
  }

  String _initials(String value) {
    final words = value.trim().split(RegExp(r'\s+'));
    if (words.length > 1) {
      return '${words.first[0]}${words.last[0]}'.toUpperCase();
    }
    return value.isEmpty ? 'A' : value[0].toUpperCase();
  }

  void _showUnavailable(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('This option is not available yet.')),
    );
  }

  Future<void> _signOut(BuildContext context) async {
    await FirebaseAuth.instance.signOut();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      (_) => false,
    );
  }
}
