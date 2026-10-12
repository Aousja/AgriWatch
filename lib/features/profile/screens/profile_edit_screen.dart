import 'package:flutter/material.dart';
import '../../../core/design/app_design.dart';
import '../../../core/design/workflow_copy.dart';
import '../models/user_profile.dart';
import '../services/user_profile_service.dart';

typedef ProfileSaver =
    Future<void> Function(String uid, Map<String, dynamic> changes);

class ProfileEditScreen extends StatefulWidget {
  final UserProfile profile;
  final bool requireDistrict;
  final ProfileSaver? saveProfile;
  const ProfileEditScreen({
    super.key,
    required this.profile,
    this.requireDistrict = false,
    this.saveProfile,
  });

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name, _district, _phone, _email, _photo;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.profile.name);
    _district = TextEditingController(text: widget.profile.district);
    _phone = TextEditingController(text: widget.profile.phoneNumber);
    _email = TextEditingController(text: widget.profile.email);
    _photo = TextEditingController(text: widget.profile.photoUrl);
  }

  @override
  void dispose() {
    for (final controller in [_name, _district, _phone, _email, _photo]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final original = widget.profile;
    // Only existing editable profile fields; Firebase identity is untouched.
    final values = <String, dynamic>{
      'name': _name.text.trim(),
      'district': _district.text.trim(),
      'phoneNumber': _phone.text.trim(),
      'email': _email.text.trim(),
      'photoUrl': _photo.text.trim(),
    };
    final before = <String, String?>{
      'name': original.name,
      'district': original.district,
      'phoneNumber': original.phoneNumber,
      'email': original.email,
      'photoUrl': original.photoUrl,
    };
    final changes = <String, dynamic>{
      for (final entry in values.entries)
        if (entry.value != (before[entry.key] ?? '')) entry.key: entry.value,
    };
    try {
      if (changes.isNotEmpty) {
        await (widget.saveProfile ?? UserProfileService().updateProfile)(
          original.uid,
          changes,
        );
      }
      if (!mounted) return;
      Navigator.pop(
        context,
        UserProfile(
          uid: original.uid,
          name: values['name'],
          district: values['district'],
          phoneNumber: values['phoneNumber'],
          email: values['email'],
          photoUrl: values['photoUrl'],
          role: original.role,
          accessGranted: original.accessGranted,
          createdAt: original.createdAt,
          updatedAt: changes.isEmpty ? original.updatedAt : DateTime.now(),
        ),
      );
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = WorkflowCopy.text(
            'Unable to save profile. Your entries are kept. Please retry.',
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Widget _field(
    String key,
    String label,
    TextEditingController controller, {
    TextInputType? keyboard,
    String? Function(String?)? validator,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: TextFormField(
      key: ValueKey(key),
      controller: controller,
      enabled: !_saving,
      keyboardType: keyboard,
      decoration: InputDecoration(labelText: WorkflowCopy.text(label)),
      validator: validator,
    ),
  );

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_saving,
    child: Scaffold(
      appBar: AppBar(title: Text(WorkflowCopy.text('Edit profile'))),
      body: Form(
        key: _form,
        child: ListView(
          padding: AppDesign.pagePadding.copyWith(top: 20, bottom: 28),
          children: [
            _field(
              'profile-name',
              'Full Name',
              _name,
              validator: (value) => value!.trim().isEmpty
                  ? WorkflowCopy.text('Please enter your name.')
                  : null,
            ),
            _field(
              'profile-district',
              'District',
              _district,
              validator: (value) =>
                  widget.requireDistrict && value!.trim().isEmpty
                  ? WorkflowCopy.text('A district is required for this report.')
                  : null,
            ),
            _field(
              'profile-phone',
              'Contact phone',
              _phone,
              keyboard: TextInputType.phone,
              validator: (value) =>
                  value!.trim().isNotEmpty &&
                      !RegExp(r'^\+?[0-9 ()-]{7,20}$').hasMatch(value.trim())
                  ? WorkflowCopy.text('Please enter a valid phone number.')
                  : null,
            ),
            _field(
              'profile-email',
              'Contact email',
              _email,
              keyboard: TextInputType.emailAddress,
              validator: (value) =>
                  value!.trim().isNotEmpty &&
                      !RegExp(
                        r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                      ).hasMatch(value.trim())
                  ? WorkflowCopy.text('Please enter a valid email address.')
                  : null,
            ),
            _field(
              'profile-photo',
              'Profile photo URL (optional)',
              _photo,
              keyboard: TextInputType.url,
              validator: (value) {
                if (value!.trim().isEmpty) return null;
                final uri = Uri.tryParse(value.trim());
                return uri?.scheme == 'https' && uri!.host.isNotEmpty
                    ? null
                    : WorkflowCopy.text('Please enter an https image URL.');
              },
            ),
            Text(
              WorkflowCopy.text(
                'These contact details do not change how you sign in.',
              ),
              style: const TextStyle(color: AppDesign.muted),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                  semanticsLabel: _error,
                ),
              ),
            const SizedBox(height: 20),
            FilledButton(
              key: const ValueKey('save-profile'),
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(WorkflowCopy.text('Save changes')),
            ),
          ],
        ),
      ),
    ),
  );
}
