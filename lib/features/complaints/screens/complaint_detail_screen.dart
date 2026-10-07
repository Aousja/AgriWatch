import 'package:flutter/material.dart';

import '../../../core/design/app_design.dart';
import '../../profile/models/user_profile.dart';
import '../models/complaint.dart';
import '../services/complaint_service.dart';
import '../widgets/complaint_status_badge.dart';
import '../widgets/complaint_timeline.dart';

class ComplaintDetailScreen extends StatefulWidget {
  final String complaintId;
  final UserProfile? profile;

  const ComplaintDetailScreen({
    super.key,
    required this.complaintId,
    this.profile,
  });

  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  final _service = ComplaintService();
  late Future<Complaint> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.getComplaint(widget.complaintId);
  }

  void _reloadComplaint() {
    setState(() {
      _future = _service.getComplaint(widget.complaintId);
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Drought report details'),
      actions: [
        IconButton(
          tooltip: 'Refresh status',
          icon: const Icon(Icons.refresh),
          onPressed: _reloadComplaint,
        ),
      ],
    ),
    body: FutureBuilder<Complaint>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: AppDesign.green),
          );
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return EmptyState(
            icon: Icons.error_outline,
            title: 'Could not load report',
            message: 'Please try again.',
            action: FilledButton(
              onPressed: _reloadComplaint,
              child: const Text('Try again'),
            ),
          );
        }
        return _content(context, snapshot.data!);
      },
    ),
  );

  Widget _content(BuildContext context, Complaint complaint) => ListView(
    padding: AppDesign.pagePadding.copyWith(top: 8, bottom: 28),
    children: [
      Text(
        complaint.title,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
          color: AppDesign.ink,
          fontWeight: FontWeight.w800,
        ),
      ),
      const SizedBox(height: 10),
      Wrap(
        spacing: 10,
        runSpacing: 8,
        children: [
          ComplaintStatusBadge(status: complaint.status),
          Text(
            complaint.ticketId,
            style: const TextStyle(
              color: AppDesign.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
      const SizedBox(height: 6),
      Text(
        'Submitted ${_date(complaint.createdAt)}',
        style: const TextStyle(color: AppDesign.muted),
      ),
      const SizedBox(height: 6),
      Text(
        'Updated ${_date(complaint.updatedAt)}',
        style: const TextStyle(color: AppDesign.muted),
      ),
      const SizedBox(height: 6),
      Text(
        'District: ${_districtLabel(complaint)}',
        style: const TextStyle(color: AppDesign.muted),
      ),
      const SizedBox(height: 28),
      const Text(
        'REPORT DETAILS',
        style: TextStyle(
          color: AppDesign.muted,
          fontSize: 12,
          letterSpacing: 1,
          fontWeight: FontWeight.w800,
        ),
      ),
      const SizedBox(height: 12),
      _detailRow('Category', complaint.category),
      if (complaint.cropType.isNotEmpty)
        _detailRow('Crop type', complaint.cropType),
      _detailRow('Description', complaint.description),
      if (complaint.resolutionNote?.trim().isNotEmpty == true)
        _detailRow(
          complaint.responseFromAdmin
              ? 'AgriWatch admin response'
              : 'Recorded response',
          complaint.resolutionNote!,
        ),
      if (complaint.evidenceImageUrl != null) ...[
        const SizedBox(height: 8),
        _evidenceImage(complaint.evidenceImageUrl!),
      ],
      const SizedBox(height: 28),
      const Text(
        'TRACKING PROGRESS',
        style: TextStyle(
          color: AppDesign.muted,
          fontSize: 12,
          letterSpacing: 1,
          fontWeight: FontWeight.w800,
        ),
      ),
      const SizedBox(height: 16),
      ComplaintTimeline(events: complaint.timeline),
      const SizedBox(height: 8),
      FilledButton.icon(
        onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Support contact will be connected soon.'),
          ),
        ),
        icon: const Icon(Icons.support_agent),
        label: const Text('Contact Support'),
      ),
    ],
  );

  Widget _detailRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppDesign.muted,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 3),
        Text(value, style: const TextStyle(color: AppDesign.ink, height: 1.35)),
      ],
    ),
  );

  Widget _evidenceImage(String url) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: Image.network(
      url,
      height: 190,
      width: double.infinity,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, progress) => progress == null
          ? child
          : const SizedBox(
              height: 190,
              child: Center(
                child: CircularProgressIndicator(color: AppDesign.green),
              ),
            ),
      errorBuilder: (_, error, stackTrace) => Container(
        height: 190,
        color: AppDesign.greenSoft,
        alignment: Alignment.center,
        child: const Text(
          'Evidence image unavailable',
          style: TextStyle(color: AppDesign.muted),
        ),
      ),
    ),
  );

  String _districtLabel(Complaint complaint) {
    final storedDistrict = complaint.district.trim();
    if (storedDistrict.isNotEmpty) return storedDistrict;
    final profileDistrict = widget.profile?.district?.trim();
    return profileDistrict == null || profileDistrict.isEmpty
        ? 'District not set'
        : profileDistrict;
  }

  String _date(DateTime value) =>
      '${value.day} ${_months[value.month - 1]} ${value.year}';

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
}
