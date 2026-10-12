import 'dart:async';
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
import 'shell_profile_view.dart';
import '../../core/services/local_storage_service.dart';

class AppShell extends StatefulWidget {
  final Future<UserProfile?> Function(bool forceRefresh)? profileLoader;
  const AppShell({super.key, this.profileLoader});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with WidgetsBindingObserver {
  int _selectedIndex = 0;
  late Future<UserProfile?> _profileFuture;
  StreamSubscription<User?>? _sessionSubscription;
  bool _profileLoading = false;
  String? _accountUid;
  bool _wasBackgrounded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _accountUid = widget.profileLoader == null
        ? FirebaseAuth.instance.currentUser?.uid
        : null;
    _profileFuture = _readProfile(false, 'startup');
    if (widget.profileLoader == null) {
      var firstEvent = true;
      _sessionSubscription = FirebaseAuth.instance.idTokenChanges().listen((
        user,
      ) {
        if (!mounted) return;
        // Firebase immediately emits the current session on subscription.
        if (firstEvent) {
          firstEvent = false;
          if (user?.uid == _accountUid) return;
        }
        if (user?.uid != _accountUid) {
          _accountUid = user?.uid;
          _refreshProfile(reason: 'account-change', replacePending: true);
        } else if (user != null) {
          _refreshProfile(reason: 'token-change');
        }
      });
    }
  }

  Future<UserProfile?> _loadProfile(bool forceRefresh) {
    if (widget.profileLoader != null) {
      return widget.profileLoader!(forceRefresh);
    }
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return Future.error(StateError('Session unavailable'));
    return _fetchCurrentProfile(
      user,
      forceRefresh,
    ).timeout(const Duration(seconds: 10));
  }

  Future<UserProfile?> _fetchCurrentProfile(
    User user,
    bool forceRefresh,
  ) async {
    if (forceRefresh) await user.getIdTokenResult(true);
    return UserProfileService().fetchProfile(user.uid);
  }

  int _profileReadGeneration = 0;

  Future<UserProfile?> _readProfile(bool forceRefresh, String reason) async {
    final generation = ++_profileReadGeneration;
    _profileLoading = true;
    assert(() {
      debugPrint(
        '[AppShell] profile read: $reason; shell=${identityHashCode(this)}',
      );
      return true;
    }());
    try {
      return await _loadProfile(forceRefresh);
    } finally {
      if (generation == _profileReadGeneration) _profileLoading = false;
    }
  }

  void _refreshProfile({
    bool forceRefresh = false,
    String reason = 'profile-update',
    bool replacePending = false,
  }) {
    if (!mounted || (_profileLoading && !replacePending)) return;
    setState(() {
      _profileFuture = _readProfile(forceRefresh, reason);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Inactive includes system overlays; refresh only after a real background.
    if (state == AppLifecycleState.paused) _wasBackgrounded = true;
    if (state == AppLifecycleState.resumed && _wasBackgrounded) {
      _wasBackgrounded = false;
      _refreshProfile(forceRefresh: true, reason: 'resume');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sessionSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: LocalStorageService.language,
      builder: (context, language, _) => Scaffold(
        body: ShellProfileView(
          key: ValueKey(_accountUid),
          future: _profileFuture,
          onRetry: () => _refreshProfile(forceRefresh: true, reason: 'retry'),
          builder: (profile) {
            final pages = [
              HomeScreen(
                profile: profile,
                onProfileUpdated: () => _refreshProfile(),
              ),
              const AlertsScreen(),
              ComplaintsScreen(
                profile: profile,
                onProfileUpdated: () => _refreshProfile(),
              ),
              ProfileScreen(
                profile: profile,
                onProfileUpdated: () => _refreshProfile(forceRefresh: true),
              ),
            ];
            return IndexedStack(index: _selectedIndex, children: pages);
          },
        ),
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
      ),
    );
  }
}
