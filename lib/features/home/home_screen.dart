import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../profile/screens/access_request_screen.dart';
import '../auth/screens/linked_sign_in_methods_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AgriWatch')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LinkedSignInMethodsScreen()),
              ),
              icon: const Icon(Iconsax.link_2),
              label: const Text('Linked Sign-In Methods'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AccessRequestScreen()),
              ),
              icon: const Icon(Iconsax.shield_tick),
              label: const Text('Request Officer or Organization Access'),
            ),
          ],
        ),
      ),
    );
  }
}