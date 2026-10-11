import 'dart:async';

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'firebase_options.dart';

import 'core/services/local_storage_service.dart';
import 'core/services/supabase_bridge.dart';
import 'core/design/app_design.dart';
import 'features/splash/splash_screen.dart';
import 'features/advisory/advisory_screen.dart';
import 'features/advisory/advisory_hint_notification.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  await SupabaseBridge.initialize();

  await GoogleSignIn.instance.initialize();

  await LocalStorageService.init();

  runApp(const AgriWatchApp());
}

class AgriWatchApp extends StatefulWidget {
  const AgriWatchApp({super.key});

  @override
  State<AgriWatchApp> createState() => _AgriWatchAppState();
}

class _AgriWatchAppState extends State<AgriWatchApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  bool _advisoryOpen = false;
  bool _inAppShell = false;
  bool _hintVisible = false;
  Timer? _hintTimer;
  late final NavigatorObserver _advisoryObserver = _AdvisoryRouteObserver(
    onAdvisoryChanged: (open) => _updateRouteState(advisoryOpen: open),
    onShellChanged: (inside) => _updateRouteState(inAppShell: inside),
    onScreenChanged: () {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showHint();
      });
    },
  );

  @override
  void dispose() {
    _hintTimer?.cancel();
    super.dispose();
  }

  void _showHint() {
    if (!_inAppShell ||
        _advisoryOpen ||
        FirebaseAuth.instance.currentUser == null) {
      return;
    }
    _hintTimer?.cancel();
    setState(() => _hintVisible = true);
    _hintTimer = Timer(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() => _hintVisible = false);
    });
  }

  void _updateRouteState({bool? advisoryOpen, bool? inAppShell}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() {
        if (advisoryOpen != null) _advisoryOpen = advisoryOpen;
        if (inAppShell != null) _inAppShell = inAppShell;
        if (_advisoryOpen || !_inAppShell) _hintVisible = false;
      });
      if (inAppShell == true && !_advisoryOpen) _showHint();
    });
  }

  Future<void> _openAdvisory() async {
    if (_advisoryOpen ||
        !_inAppShell ||
        FirebaseAuth.instance.currentUser == null) {
      return;
    }
    setState(() => _advisoryOpen = true);
    await _navigatorKey.currentState?.push(
      MaterialPageRoute(
        settings: const RouteSettings(name: 'farmer-advisory'),
        builder: (_) => const AdvisoryScreen(),
      ),
    );
    if (mounted) setState(() => _advisoryOpen = false);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      navigatorObservers: [_advisoryObserver],
      title: 'AgriWatch',
      debugShowCheckedModeBanner: false,
      theme: AppDesign.theme(),
      locale: Locale(LocalStorageService.getLanguage()),
      supportedLocales: const [Locale('en'), Locale('ur')],
      builder: (context, child) =>
          NotificationListener<AdvisoryHintNotification>(
            onNotification: (_) {
              _showHint();
              return true;
            },
            child: StreamBuilder<User?>(
              stream: FirebaseAuth.instance.authStateChanges(),
              initialData: FirebaseAuth.instance.currentUser,
              builder: (context, snapshot) => Stack(
                children: [
                  ?child,
                  if (snapshot.data != null && _inAppShell && !_advisoryOpen)
                    Positioned(
                      right: 16,
                      bottom: 96,
                      child: SafeArea(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (_hintVisible) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppDesign.border),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x22000000),
                                      blurRadius: 8,
                                      offset: Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: const Text(
                                  'Hi there!',
                                  style: TextStyle(
                                    color: AppDesign.greenDark,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                            ],
                            Semantics(
                              button: true,
                              label: 'Farmer advisory',
                              child: GestureDetector(
                                onTap: _openAdvisory,
                                child: Container(
                                  width: 64,
                                  height: 64,
                                  decoration: const BoxDecoration(
                                    color: AppDesign.green,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.support_agent,
                                    size: 32,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
      home: const SplashScreen(),
    );
  }
}

class _AdvisoryRouteObserver extends NavigatorObserver {
  _AdvisoryRouteObserver({
    required this.onAdvisoryChanged,
    required this.onShellChanged,
    required this.onScreenChanged,
  });
  final void Function(bool open) onAdvisoryChanged;
  final void Function(bool inside) onShellChanged;
  final VoidCallback onScreenChanged;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route.settings.name == 'farmer-advisory') onAdvisoryChanged(true);
    if (route.settings.name == 'app-shell') onShellChanged(true);
    onScreenChanged();
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route.settings.name == 'farmer-advisory') onAdvisoryChanged(false);
    if (route.settings.name == 'app-shell') onShellChanged(false);
    onScreenChanged();
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (route.settings.name == 'app-shell') onShellChanged(false);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (oldRoute?.settings.name == 'app-shell') onShellChanged(false);
    if (newRoute?.settings.name == 'app-shell') onShellChanged(true);
    onScreenChanged();
  }
}
