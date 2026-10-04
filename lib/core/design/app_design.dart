import 'package:flutter/material.dart';

import '../services/local_storage_service.dart';

class AppCopy {
  static bool get isUrdu => LocalStorageService.getLanguage() == 'ur';

  static String text(String english, String urdu) => isUrdu ? urdu : english;
}

class AppDesign {
  static const green = Color(0xFF2E7D32);
  static const greenDark = Color(0xFF1B5E20);
  static const greenSoft = Color(0xFFE8F5E9);
  static const canvas = Color(0xFFF7F9F6);
  static const ink = Color(0xFF17321D);
  static const muted = Color(0xFF64716A);
  static const border = Color(0xFFDCE5DC);
  static const radius = 18.0;
  static const pagePadding = EdgeInsets.symmetric(horizontal: 20);

  static ThemeData theme() {
    final scheme = ColorScheme.fromSeed(
      seedColor: green,
      brightness: Brightness.light,
      surface: canvas,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme.copyWith(primary: green, onPrimary: Colors.white),
      scaffoldBackgroundColor: canvas,
      fontFamily: 'sans',
      appBarTheme: const AppBarTheme(
        backgroundColor: canvas,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: border),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: greenSoft,
        labelTextStyle: WidgetStatePropertyAll(
          const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class AppSectionHeader extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;

  const AppSectionHeader({super.key, required this.title, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, color: AppDesign.ink))),
        if (action != null)
          TextButton(onPressed: onAction, child: Text(action!)),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  const EmptyState({super.key, required this.icon, required this.title, required this.message, this.action});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(color: AppDesign.greenSoft, shape: BoxShape.circle),
            child: Icon(icon, color: AppDesign.green, size: 30),
          ),
          const SizedBox(height: 18),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppDesign.ink)),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppDesign.muted, height: 1.45)),
          if (action != null) ...[const SizedBox(height: 22), action!],
        ],
      ),
    );
  }
}

class StatusCard extends StatelessWidget {
  const StatusCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppDesign.radius),
        border: Border.all(color: AppDesign.border),
      ),
      child: Row(
        children: [
          Container(width: 48, height: 48, decoration: const BoxDecoration(color: AppDesign.greenSoft, shape: BoxShape.circle), child: const Icon(Icons.eco_outlined, color: AppDesign.green)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(AppCopy.text('Monitoring data', 'نگرانی کا ڈیٹا'), style: const TextStyle(fontWeight: FontWeight.w800, color: AppDesign.ink)),
            const SizedBox(height: 4),
            Text(AppCopy.text('Live local conditions will appear here once monitoring is connected.', 'لائیو مقامی حالات کی نگرانی منسلک ہونے کے بعد یہاں ظاہر ہوں گے۔'), style: const TextStyle(color: AppDesign.muted, height: 1.35)),
          ])),
        ],
      ),
    );
  }
}

class ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const ActionTile({super.key, required this.icon, required this.title, required this.subtitle, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: title,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppDesign.border)),
          child: Row(children: [
            Icon(icon, color: AppDesign.green, size: 24),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppDesign.ink)),
              const SizedBox(height: 3),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: AppDesign.muted)),
            ])),
            const Icon(Icons.chevron_right, color: AppDesign.muted),
          ]),
        ),
      ),
    );
  }
}
