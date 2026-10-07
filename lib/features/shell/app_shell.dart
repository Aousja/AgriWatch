import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/design/app_design.dart';
import '../alerts/alerts_screen.dart';
import '../complaints/complaints_screen.dart';
import '../home/home_screen.dart';
import '../profile/models/user_profile.dart';
import '../profile/screens/profile_screen.dart';
import '../profile/services/user_profile_service.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;
  late Future<UserProfile?> _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = UserProfileService().fetchProfile(
      FirebaseAuth.instance.currentUser!.uid,
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile?>(
      future: _profileFuture,
      builder: (context, snapshot) {
        final profile = snapshot.data;
        final pages = [
          HomeScreen(profile: profile),
          const AlertsScreen(),
          ComplaintsScreen(profile: profile),
          ProfileScreen(
            profile: profile,
            onProfileUpdated: () => setState(() {
              _profileFuture = UserProfileService().fetchProfile(
                FirebaseAuth.instance.currentUser!.uid,
              );
            }),
          ),
        ];
        return Scaffold(
          body: snapshot.connectionState == ConnectionState.waiting
              ? const Center(
                  child: CircularProgressIndicator(color: AppDesign.green),
                )
              : IndexedStack(index: _selectedIndex, children: pages),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) =>
                setState(() => _selectedIndex = index),
            destinations: [
              NavigationDestination(
                icon: const Icon(Iconsax.home_2),
                selectedIcon: const Icon(Iconsax.home_25),
                label: AppCopy.text('Home', 'ہوم'),
              ),
              NavigationDestination(
                icon: const Icon(Iconsax.notification),
                selectedIcon: const Icon(Iconsax.notification5),
                label: AppCopy.text('Alerts', 'انتباہات'),
              ),
              NavigationDestination(
                icon: const Icon(Iconsax.note_text),
                selectedIcon: const Icon(Iconsax.note_215),
                label: AppCopy.text('Drought reports', 'خشک سالی کی رپورٹس'),
              ),
              NavigationDestination(
                icon: const Icon(Iconsax.profile_circle),
                selectedIcon: const Icon(Iconsax.profile_circle5),
                label: AppCopy.text('Profile', 'پروفائل'),
              ),
            ],
          ),
        );
      },
    );
  }
}
