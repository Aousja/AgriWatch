import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../auth//screens/welcome_screen.dart';
import '../home/home_screen.dart';
import '../language/language_screen.dart';
import '../../core/services/local_storage_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  late final VideoPlayerController _controller;
  bool _hasNavigated = false;

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

    if (!mounted) return;

    setState(() {});

    _controller.play();

    _controller.addListener(_videoListener);
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

    final bool languageSelected =
    LocalStorageService.isLanguageSelected();

    final bool isLoggedIn =
    LocalStorageService.isLoggedIn();

    Widget nextScreen;

    if (!languageSelected) {
      nextScreen = const LanguageScreen();
    } else if (!isLoggedIn) {
      nextScreen = const WelcomeScreen();
    } else {
      nextScreen = const HomeScreen();
    }

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => nextScreen,
      ),
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_videoListener);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: _controller.value.isInitialized
            ? AspectRatio(
                aspectRatio: _controller.value.aspectRatio,
                child: VideoPlayer(_controller),
              )
            : const SizedBox(),
      ),
    );
  }
}