import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:iconsax/iconsax.dart';

import '../../shell/app_shell.dart';
import '../../../core/services/local_storage_service.dart';
import '../models/user_profile.dart';
import '../services/user_profile_service.dart';
import '../../../core/design/workflow_copy.dart';

class ProfileSetupScreen extends StatefulWidget {
  final User user;

  const ProfileSetupScreen({super.key, required this.user});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _districtController = TextEditingController();
  final UserProfileService _userProfileService = UserProfileService();
  bool _isSaving = false;
  String? _selectedRole;

  bool get _isUrdu => LocalStorageService.getLanguage() == 'ur';

  Future<void> _saveProfile() async {
    if (_isSaving) return;
    final name = _nameController.text.trim();

    if (name.isEmpty || _selectedRole == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            WorkflowCopy.text('Please enter your name and select your role.'),
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final profile = UserProfile(
        uid: widget.user.uid,
        name: name,
        phoneNumber: widget.user.phoneNumber,
        email: widget.user.email,
        photoUrl: widget.user.photoURL,
        role: _selectedRole!,
        district: _districtController.text.trim().isEmpty
            ? null
            : _districtController.text.trim(),
        createdAt: DateTime.now(),
      );

      // A retry or another session may have completed setup already.
      // A failed read propagates to the retry state and never creates a profile.
      final existing = await _userProfileService.fetchProfile(widget.user.uid);
      if (existing == null) await _userProfileService.createProfile(profile);

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const AppShell()),
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            WorkflowCopy.text(
              'Unable to save profile. Your entries are kept. Please retry.',
            ),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _districtController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(WorkflowCopy.text('Profile Setup')),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: EdgeInsets.fromLTRB(
            24,
            24,
            24,
            MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                WorkflowCopy.text('Tell us about you'),
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                WorkflowCopy.text(
                  'This helps us personalize your AgriWatch experience.',
                ),
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: WorkflowCopy.text('Full Name'),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _districtController,
                decoration: InputDecoration(
                  labelText: WorkflowCopy.text('District (optional)'),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                _isUrdu ? 'اپنا کردار منتخب کریں' : 'Choose your role',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              _roleCard(
                role: 'farmer',
                title: _isUrdu ? 'کسان' : 'Farmer',
                description: _isUrdu
                    ? 'فصلیں اگانے اور خشک سالی کی اطلاعات حاصل کرنے کے لیے'
                    : 'For people who grow crops and need drought alerts and crop advisory',
                icon: Iconsax.tree,
              ),
              const SizedBox(height: 10),
              _roleCard(
                role: 'citizen',
                title: _isUrdu ? 'عام عوام' : 'General Public',
                description: _isUrdu
                    ? 'اپنے علاقے میں خشک سالی کی صورتحال دیکھنے کے لیے'
                    : 'For anyone who wants to follow drought conditions in their area',
                icon: Iconsax.people,
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                height: 58,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2E7D32),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  onPressed: _isSaving || _selectedRole == null
                      ? null
                      : _saveProfile,
                  child: _isSaving
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          WorkflowCopy.text('Continue'),
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleCard({
    required String role,
    required String title,
    required String description,
    required IconData icon,
  }) {
    final selected = _selectedRole == role;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => setState(() => _selectedRole = role),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE8F5E9) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? const Color(0xFF2E7D32) : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF2E7D32), size: 28),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(color: Colors.grey.shade700, height: 1.3),
                  ),
                ],
              ),
            ),
            Icon(
              selected ? Iconsax.tick_circle : Iconsax.record_circle,
              color: selected ? const Color(0xFF2E7D32) : Colors.grey,
            ),
          ],
        ),
      ),
    );
  }
}
