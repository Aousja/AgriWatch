import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import '../../../core/design/app_design.dart';
import '../models/complaint.dart';
import '../services/complaint_service.dart';
import '../widgets/complaint_category_selector.dart';
import '../../profile/models/user_profile.dart';
import 'complaint_detail_screen.dart';
import 'complaints_screen.dart';
import '../../../core/design/workflow_copy.dart';
import '../../profile/screens/profile_edit_screen.dart';

class SubmitComplaintScreen extends StatefulWidget {
  final UserProfile? profile;
  final ComplaintService? service;
  final ValueChanged<UserProfile>? onProfileChanged;
  final Future<UserProfile?> Function(UserProfile)? editProfile;

  const SubmitComplaintScreen({
    super.key,
    this.profile,
    this.service,
    this.onProfileChanged,
    this.editProfile,
  });
  @override
  State<SubmitComplaintScreen> createState() => _SubmitComplaintScreenState();
}

class _SubmitComplaintScreenState extends State<SubmitComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  UserProfile? _profile;
  ComplaintService get _service =>
      widget.service ?? ComplaintService(profile: _profile);
  String? _category, _crop;
  bool _loading = false;
  bool _submitted = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _profile = widget.profile;
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_loading,
    child: Scaffold(
      appBar: AppBar(
        title: Text(WorkflowCopy.text('Report Drought Situation')),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: AppDesign.pagePadding.copyWith(top: 8, bottom: 28),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppDesign.greenSoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.agriculture,
                    color: AppDesign.green,
                    size: 38,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'AgriWatch',
                          style: TextStyle(
                            color: AppDesign.greenDark,
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          WorkflowCopy.text(
                            'Report a drought situation affecting your area. AgriWatch admins receive and review every new report.',
                          ),
                          style: const TextStyle(
                            color: AppDesign.muted,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 26),
            Text(
              WorkflowCopy.text(
                'Routine farming advice is not available in this mobile app. Use this form for drought situations.',
              ),
              style: const TextStyle(color: AppDesign.muted, height: 1.35),
            ),
            const SizedBox(height: 16),
            _heading('DISTRICT'),
            _readOnlyDistrict(),
            TextButton.icon(
              key: const ValueKey('edit-report-district'),
              onPressed: _loading || _profile == null ? null : _editDistrict,
              icon: const Icon(Icons.edit_location_alt_outlined),
              label: Text(
                WorkflowCopy.text(
                  _hasDistrict ? 'Edit district' : 'Add district',
                ),
              ),
            ),
            if (!_hasDistrict)
              Text(
                WorkflowCopy.text(
                  'Add your district in your profile, then return here. Your report text will be kept.',
                ),
                style: const TextStyle(color: AppDesign.muted),
              ),
            const SizedBox(height: 24),
            _heading('DROUGHT REPORT CATEGORY'),
            ComplaintCategorySelector(
              enabled: !_loading,
              selected: _category,
              onSelected: (value) => setState(() => _category = value),
            ),
            if (_category == null) _hint('Select a category'),
            const SizedBox(height: 24),
            _heading('CROP TYPE (OPTIONAL)'),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: _crop,
              decoration: InputDecoration(
                hintText: WorkflowCopy.text('Choose crop type'),
              ),
              items: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Other']
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(WorkflowCopy.text(value)),
                    ),
                  )
                  .toList(),
              onChanged: _loading
                  ? null
                  : (value) => setState(() => _crop = value),
            ),
            const SizedBox(height: 24),
            _heading('DESCRIBE THE DROUGHT SITUATION'),
            TextFormField(
              key: const ValueKey('report-description'),
              enabled: !_loading,
              controller: _description,
              maxLines: 5,
              minLines: 4,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: WorkflowCopy.text(
                  'Please explain what happened, where it happened, and any relevant details.',
                ),
              ),
              validator: (value) => value == null || value.trim().length < 10
                  ? WorkflowCopy.text(
                      'Please add at least 10 characters of detail.',
                    )
                  : null,
            ),
            const SizedBox(height: 28),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            if (_error != null)
              TextButton(
                onPressed: _loading
                    ? null
                    : () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ComplaintsScreen(
                            profile: _profile,
                            service: widget.service,
                          ),
                        ),
                      ),
                child: Text(WorkflowCopy.text('Check report tracking')),
              ),
            SizedBox(
              height: 52,
              child: FilledButton(
                key: const ValueKey('submit-report'),
                onPressed: _loading || _submitted || _category == null
                    ? null
                    : _submit,
                child: _loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(WorkflowCopy.text('Submit report')),
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _heading(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      WorkflowCopy.text(text),
      style: const TextStyle(
        color: AppDesign.muted,
        fontSize: 12,
        letterSpacing: 1,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
  Widget _hint(String text) => Padding(
    padding: const EdgeInsets.only(top: 6),
    child: Text(
      WorkflowCopy.text(text),
      style: const TextStyle(color: Colors.red, fontSize: 12),
    ),
  );

  Widget _readOnlyDistrict() => InputDecorator(
    decoration: const InputDecoration(
      prefixIcon: Icon(Icons.location_on_outlined),
    ),
    child: Text(
      _districtLabel,
      style: const TextStyle(color: AppDesign.ink, fontWeight: FontWeight.w600),
    ),
  );

  String get _districtLabel {
    final district = _profile?.district?.trim();
    return district == null || district.isEmpty
        ? WorkflowCopy.text('District not set')
        : district;
  }

  bool get _hasDistrict => _profile?.district?.trim().isNotEmpty == true;

  Future<void> _editDistrict() async {
    final profile = _profile;
    if (profile == null || _loading) return;
    final updated = widget.editProfile != null
        ? await widget.editProfile!(profile)
        : await Navigator.push<UserProfile>(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  ProfileEditScreen(profile: profile, requireDistrict: true),
            ),
          );
    if (!mounted || updated == null) return;
    setState(() {
      _profile = updated;
      _error = null;
    });
    widget.onProfileChanged?.call(updated);
  }

  Future<void> _submit() async {
    if (_loading || _submitted) return;
    if (!_hasDistrict) {
      setState(
        () => _error = WorkflowCopy.text(
          'A district is required for this report.',
        ),
      );
      await _editDistrict();
      return;
    }
    if (_category == null) {
      setState(() {});
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final complaint = await _service.submit(
        category: _category!,
        cropType: _crop ?? '',
        description: _description.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _submitted = true;
        _loading = false;
      });
      // Keep the parent route's completion pending until confirmation/details
      // finish, so tracking refreshes when the user actually returns.
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ComplaintSuccessScreen(
            complaint: complaint,
            profile: _profile,
            service: widget.service,
          ),
        ),
      );
      if (mounted) Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      final rolloutMissing =
          error is StateError &&
          (error.message.toString().contains('rollout') ||
              error.message.toString().contains('Supabase is required'));
      setState(
        () => _error = WorkflowCopy.text(
          rolloutMissing
              ? 'Drought reporting is unavailable until the required database update is completed. Your entries are kept.'
              : 'Could not confirm submission. Your entries are kept. Check report tracking before retrying.',
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class ComplaintSuccessScreen extends StatelessWidget {
  final Complaint complaint;
  final UserProfile? profile;
  final ComplaintService? service;

  const ComplaintSuccessScreen({
    super.key,
    required this.complaint,
    this.profile,
    this.service,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: AppDesign.pagePadding,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                height: 170,
                child: Lottie.asset(
                  'assets/animations/check.json',
                  repeat: false,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                WorkflowCopy.text('Report submitted'),
                style: const TextStyle(
                  color: AppDesign.ink,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                AppCopy.text(
                  'Your ticket ID is ${complaint.ticketId}',
                  'آپ کا ٹکٹ نمبر ${complaint.ticketId} ہے',
                ),
                style: const TextStyle(
                  color: AppDesign.green,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                WorkflowCopy.text(
                  'Your report has been recorded for AgriWatch admin review. Track stored updates here.',
                ),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppDesign.muted, height: 1.4),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ComplaintDetailScreen(
                          complaintId: complaint.id,
                          profile: profile,
                          service: service,
                        ),
                      ),
                    );
                    if (context.mounted) Navigator.pop(context);
                  },
                  child: Text(WorkflowCopy.text('View report')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
