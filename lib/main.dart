import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'firebase_options.dart';

import 'core/services/local_storage_service.dart';
import 'core/services/supabase_bridge.dart';
import 'core/design/app_design.dart';
import 'features/splash/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  await SupabaseBridge.initialize();

  await GoogleSignIn.instance.initialize();

  await LocalStorageService.init();

  runApp(const AgriWatchApp());
}

class AgriWatchApp extends StatelessWidget {
  const AgriWatchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgriWatch',
      debugShowCheckedModeBanner: false,
      theme: AppDesign.theme(),
      locale: Locale(LocalStorageService.getLanguage()),
      supportedLocales: const [Locale('en'), Locale('ur')],
      home: const SplashScreen(),
    );
  }
}
