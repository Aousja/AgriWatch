import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../services/firebase_auth_service.dart';
import '../widgets/google_logo_icon.dart';

class LinkedSignInMethodsScreen extends StatefulWidget {
  const LinkedSignInMethodsScreen({super.key});

  @override
  State<LinkedSignInMethodsScreen> createState() =>
      _LinkedSignInMethodsScreenState();
}

class _LinkedSignInMethodsScreenState
    extends State<LinkedSignInMethodsScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _loading = false;
  String? _verificationId;
  late Set<String> _providers;

  @override
  void initState() {
    super.initState();
    _providers = _providerIds;
  }

  Set<String> get _providerIds => {
        for (final info in FirebaseAuth.instance.currentUser?.providerData ?? [])
          info.providerId,
      };

  bool _hasProvider(String providerId) => _providers.contains(providerId);

  Future<void> _linkGoogle() async {
    setState(() => _loading = true);
    try {
      final credential = await FirebaseAuthService.instance.getGoogleCredential();
      if (credential == null) return;
      await FirebaseAuthService.instance.linkCredential(credential);
      await _refreshProviders();
      _showMessage('Google has been linked to your AgriWatch account.');
    } on FirebaseAuthException catch (e) {
      _showAuthError(e, 'Google account');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _linkEmail() async {
    final details = await _emailDetailsDialog();
    if (details == null) return;

    setState(() => _loading = true);
    try {
      final credential = FirebaseAuthService.instance.emailCredential(
        email: details.$1,
        password: details.$2,
      );
      await FirebaseAuthService.instance.linkCredential(credential);
      await _refreshProviders();
      _showMessage('Email has been linked to your AgriWatch account.');
    } on FirebaseAuthException catch (e) {
      _showAuthError(e, 'Email');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendPhoneCode() async {
    final phone = _phoneController.text.trim();
    if (!RegExp(r'^03\d{9}$').hasMatch(phone)) {
      _showMessage('Enter an 11-digit phone number starting with 03.', true);
      return;
    }

    setState(() => _loading = true);
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: '+92${phone.substring(1)}',
      verificationCompleted: (credential) async {
        try {
          await FirebaseAuthService.instance.linkCredential(credential);
          await _refreshProviders();
          _showMessage('Phone number has been linked to your account.');
        } on FirebaseAuthException catch (e) {
          _showAuthError(e, 'Phone number');
        } finally {
          if (mounted) setState(() => _loading = false);
        }
      },
      verificationFailed: (error) {
        if (mounted) setState(() => _loading = false);
        _showMessage(error.message ?? 'Unable to send the verification code.', true);
      },
      codeSent: (verificationId, _) {
        if (mounted) {
          setState(() {
            _verificationId = verificationId;
            _loading = false;
          });
          _showMessage('Verification code sent.');
        }
      },
      codeAutoRetrievalTimeout: (verificationId) => _verificationId = verificationId,
    );
  }

  Future<void> _verifyPhoneCode() async {
    final verificationId = _verificationId;
    if (verificationId == null || _otpController.text.trim().length != 6) {
      _showMessage('Enter the 6-digit verification code.', true);
      return;
    }

    setState(() => _loading = true);
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: _otpController.text.trim(),
      );
      await FirebaseAuthService.instance.linkCredential(credential);
      await _refreshProviders();
      _otpController.clear();
      setState(() => _verificationId = null);
      _showMessage('Phone number has been linked to your account.');
    } on FirebaseAuthException catch (e) {
      _showAuthError(e, 'Phone number');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refreshProviders() async {
    await FirebaseAuth.instance.currentUser?.reload();
    if (mounted) setState(() => _providers = _providerIds);
  }

  Future<(String, String)?> _emailDetailsDialog() async {
    final email = TextEditingController();
    final password = TextEditingController();
    final result = await showDialog<(String, String)>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Link email'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address')),
            const SizedBox(height: 12),
            TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, (email.text.trim(), password.text)), child: const Text('Link')),
        ],
      ),
    );
    email.dispose();
    password.dispose();
    return result;
  }

  void _showAuthError(FirebaseAuthException error, String providerName) {
    final message = error.code == 'credential-already-in-use'
        ? 'This $providerName is already linked to a different AgriWatch account.'
        : error.code == 'provider-already-linked'
            ? '$providerName is already linked to this account.'
            : 'Unable to link $providerName. Please try again.';
    _showMessage(message, true);
  }

  void _showMessage(String message, [bool error = false]) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? Colors.red : const Color(0xFF2E7D32),
    ));
  }

  Widget _providerRow({required String id, required String label, required Widget icon, VoidCallback? onLink}) {
    final linked = _hasProvider(id);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: SizedBox(width: 36, child: Center(child: icon)),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(linked ? 'Linked to this account' : 'Not linked'),
      trailing: linked
          ? const Icon(Iconsax.tick_circle, color: Color(0xFF2E7D32))
          : OutlinedButton(onPressed: _loading ? null : onLink, child: const Text('Link')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Linked Sign-In Methods')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Your sign-in methods', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Link more methods to keep one AgriWatch account and one profile.'),
            const SizedBox(height: 24),
            _providerRow(id: 'phone', label: 'Phone', icon: const Icon(Iconsax.call, color: Color(0xFF2E7D32)), onLink: _sendPhoneCode),
            if (_verificationId != null) ...[
              const SizedBox(height: 8),
              TextField(controller: _otpController, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'Verification code', counterText: '')),
              const SizedBox(height: 8),
              SizedBox(width: double.infinity, child: FilledButton(onPressed: _loading ? null : _verifyPhoneCode, child: const Text('Verify and link phone'))),
            ],
            _providerRow(id: 'google.com', label: 'Google', icon: const GoogleLogoIcon(size: 24), onLink: _linkGoogle),
            _providerRow(id: 'password', label: 'Email and password', icon: const Icon(Iconsax.sms, color: Color(0xFF2E7D32)), onLink: _linkEmail),
            if (_loading) const Padding(padding: EdgeInsets.only(top: 20), child: Center(child: CircularProgressIndicator())),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }
}
