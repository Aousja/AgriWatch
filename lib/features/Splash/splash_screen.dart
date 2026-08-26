import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:video_player/video_player.dart';

import '../../core/config/app_config.dart';
import '../../core/services/local_storage_service.dart';
import '../auth/auth_gate.dart';
import '../language/language_screen.dart';
import '../auth/screens/welcome_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  late final VideoPlayerController _controller;
  bool _hasNavigated = false;
  bool _readyToShow = false;

  @override
  void initState() {
    super.initState();

    _controller = VideoPlayerController.asset(
      'assets/videos/0731_fixed.mp4',
    );

    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    await _controller.initialize();
    await _controller.setLooping(false);
    await _controller.seekTo(Duration.zero);

    if (!mounted) return;

    await _controller.play();

    _controller.addListener(_readyListener);
    _controller.addListener(_videoListener);
  }

  void _readyListener() {
    if (!_readyToShow &&
        _controller.value.isPlaying &&
        _controller.value.position > Duration.zero) {
      setState(() => _readyToShow = true);
      _controller.removeListener(_readyListener);
    }
  }

  void _videoListener() {
    if (!_controller.value.isInitialized) return;

    if (!_hasNavigated &&
        _controller.value.position >= _controller.value.duration &&
        _controller.value.duration != Duration.zero) {
      _hasNavigated = true;
      _navigateNext();
    }
  }

  Future<void> _navigateNext() async {
    if (!mounted) return;

    final currentUser = FirebaseAuth.instance.currentUser;
    final Widget nextScreen;

    if (!AppConfig.forceLoginScreenOnStartup && currentUser != null) {
      nextScreen = const AuthGate();
    } else if (LocalStorageService.isLanguageSelected()) {
      nextScreen = const WelcomeScreen();
    } else {
      nextScreen = const LanguageScreen();
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => nextScreen,
      ),
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_readyListener);
    _controller.removeListener(_videoListener);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: _readyToShow
            ? AspectRatio(
                aspectRatio: _controller.value.aspectRatio,
                child: VideoPlayer(_controller),
              )
            : const SizedBox(),
      ),
    );
  }
}