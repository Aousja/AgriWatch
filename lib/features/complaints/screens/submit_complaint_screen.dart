import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import '../../../core/design/app_design.dart';
import '../models/complaint.dart';
import '../services/complaint_service.dart';
import '../widgets/complaint_category_selector.dart';
import '../../profile/models/user_profile.dart';
import 'complaint_detail_screen.dart';

class SubmitComplaintScreen extends StatefulWidget {
  final UserProfile? profile;

  const SubmitComplaintScreen({super.key, this.profile});
  @override
  State<SubmitComplaintScreen> createState() => _SubmitComplaintScreenState();
}

class _SubmitComplaintScreenState extends State<SubmitComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _description = TextEditingController();
  late final ComplaintService _service;
  String? _category, _crop;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _service = ComplaintService(profile: widget.profile);
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Report Drought Situation')),
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
            child: const Row(
              children: [
                Icon(Icons.agriculture, color: AppDesign.green, size: 38),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AgriWatch',
                        style: TextStyle(
                          color: AppDesign.greenDark,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Report a drought situation affecting your area. AgriWatch admins receive and review every new report.',
                        style: TextStyle(color: AppDesign.muted, height: 1.35),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 26),
          const Text(
            'For routine farming questions, use Crop advisory from Home. Reports are for drought situations, not farming advice. Mobile crop advisory is awaiting connection; crop advice is available in the farmer web portal.',
            style: TextStyle(color: AppDesign.muted, height: 1.35),
          ),
          const SizedBox(height: 16),
          _heading('DISTRICT'),
          _readOnlyDistrict(),
          const SizedBox(height: 24),
          _heading('DROUGHT REPORT CATEGORY'),
          ComplaintCategorySelector(
            selected: _category,
            onSelected: (value) => setState(() => _category = value),
          ),
          if (_category == null) _hint('Select a category'),
          const SizedBox(height: 24),
          _heading('CROP TYPE (OPTIONAL)'),
          DropdownButtonFormField<String>(
            initialValue: _crop,
            decoration: const InputDecoration(hintText: 'Choose crop type'),
            items: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Other']
                .map(
                  (value) => DropdownMenuItem(value: value, child: Text(value)),
                )
                .toList(),
            onChanged: (value) => setState(() => _crop = value),
          ),
          const SizedBox(height: 24),
          _heading('DESCRIBE THE DROUGHT SITUATION'),
          TextFormField(
            controller: _description,
            maxLines: 5,
            minLines: 4,
            textInputAction: TextInputAction.newline,
            decoration: const InputDecoration(
              hintText:
                  'Please explain what happened, where it happened, and any relevant details.',
            ),
            validator: (value) => value == null || value.trim().length < 10
                ? 'Please add a little more detail'
                : null,
          ),
          const SizedBox(height: 28),
          SizedBox(
            height: 52,
            child: FilledButton(
              onPressed: _loading || _category == null ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Submit report'),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _heading(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(
      text,
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
    child: Text(text, style: const TextStyle(color: Colors.red, fontSize: 12)),
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
    final district = widget.profile?.district?.trim();
    return district == null || district.isEmpty ? 'District not set' : district;
  }

  Future<void> _submit() async {
    if (_category == null) {
      setState(() {});
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final complaint = await _service.submit(
        category: _category!,
        cropType: _crop ?? '',
        description: _description.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => ComplaintSuccessScreen(
            complaint: complaint,
            profile: widget.profile,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      final message = error.toString();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class ComplaintSuccessScreen extends StatelessWidget {
  final Complaint complaint;
  final UserProfile? profile;

  const ComplaintSuccessScreen({
    super.key,
    required this.complaint,
    this.profile,
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
              const Text(
                'Report submitted',
                style: TextStyle(
                  color: AppDesign.ink,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Your ticket ID is ${complaint.ticketId}',
                style: const TextStyle(
                  color: AppDesign.green,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your report has been recorded for AgriWatch admin review. Track stored updates here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppDesign.muted, height: 1.4),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => ComplaintDetailScreen(
                        complaintId: complaint.id,
                        profile: profile,
                      ),
                    ),
                  ),
                  child: const Text('View report'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
