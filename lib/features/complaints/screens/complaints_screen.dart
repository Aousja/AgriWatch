import 'package:flutter/material.dart';
import '../../../core/design/app_design.dart';
import '../../profile/models/user_profile.dart';
import '../models/complaint.dart';
import '../models/complaint_status.dart';
import '../services/complaint_service.dart';
import '../widgets/complaint_card.dart';
import '../widgets/complaint_summary_card.dart';
import 'complaint_detail_screen.dart';
import 'submit_complaint_screen.dart';

class ComplaintsScreen extends StatefulWidget {
  final UserProfile? profile;

  const ComplaintsScreen({super.key, this.profile});
  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends State<ComplaintsScreen> {
  final _service = ComplaintService();
  final _search = TextEditingController();
  late Future<List<Complaint>> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.getComplaints();
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _reloadComplaints() {
    setState(() {
      _future = _service.getComplaints();
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Drought report tracking'),
      actions: [
        IconButton(
          onPressed: _reloadComplaints,
          icon: const Icon(Icons.refresh),
          tooltip: 'Refresh reports',
        ),
        IconButton(
          onPressed: () => _filter(context),
          icon: const Icon(Icons.tune),
          tooltip: 'Filter',
        ),
      ],
    ),
    body: FutureBuilder<List<Complaint>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: AppDesign.green),
          );
        }
        if (snapshot.hasError) {
          return EmptyState(
            icon: Icons.error_outline,
            title: 'Could not load reports',
            message: 'Please try again.',
            action: FilledButton(
              onPressed: _reloadComplaints,
              child: const Text('Try again'),
            ),
          );
        }
        final all = snapshot.data ?? <Complaint>[];
        final query = _search.text.toLowerCase();
        final items = all
            .where(
              (c) =>
                  c.ticketId.toLowerCase().contains(query) ||
                  c.title.toLowerCase().contains(query),
            )
            .toList();
        final active = all
            .where(
              (c) =>
                  c.status != ComplaintStatus.resolved &&
                  c.status != ComplaintStatus.rejected,
            )
            .length;
        return ListView(
          padding: AppDesign.pagePadding.copyWith(top: 4, bottom: 28),
          children: [
            TextField(
              controller: _search,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search by Ticket ID or Topic...',
                suffixIcon: Icon(Icons.tune),
              ),
            ),
            const SizedBox(height: 18),
            ComplaintSummaryCard(
              active: active,
              attention: all
                  .where(
                    (c) =>
                        c.status == ComplaintStatus.underReview ||
                        c.status == ComplaintStatus.submitted,
                  )
                  .length,
            ),
            const SizedBox(height: 26),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'RECENT SUBMISSIONS',
                    style: TextStyle(
                      color: AppDesign.muted,
                      fontSize: 12,
                      letterSpacing: 1,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => _showHistory(context, all),
                  child: const Text('View History'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (all.isEmpty)
              EmptyState(
                icon: Icons.assignment_outlined,
                title: 'No drought reports yet',
                message:
                    'Your drought reports and recorded updates will appear here. For routine farming questions, use Crop advisory.',
                action: FilledButton.icon(
                  onPressed: () => _openSubmit(context),
                  icon: const Icon(Icons.add),
                  label: const Text('Report Drought Situation'),
                ),
              )
            else if (items.isEmpty)
              const EmptyState(
                icon: Icons.search_off,
                title: 'No matching reports',
                message: 'Try another ticket ID or topic.',
              )
            else
              ...items.map(
                (c) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ComplaintCard(
                    complaint: c,
                    district: c.district.isEmpty ? _districtLabel : c.district,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ComplaintDetailScreen(
                            complaintId: c.id,
                            profile: widget.profile,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            if (all.isNotEmpty) ...[
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _openSubmit(context),
                icon: const Icon(Icons.add),
                label: const Text('Report Drought Situation'),
              ),
            ],
          ],
        );
      },
    ),
  );

  void _filter(BuildContext context) => showModalBottomSheet(
    context: context,
    builder: (_) => const SafeArea(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Text('Filters will be connected to report status soon.'),
      ),
    ),
  );

  void _openSubmit(BuildContext context) {
    Navigator.of(context)
        .push(
          MaterialPageRoute(
            builder: (_) => SubmitComplaintScreen(profile: widget.profile),
          ),
        )
        .then((_) {
          if (mounted) _reloadComplaints();
        });
  }

  String get _districtLabel {
    final district = widget.profile?.district?.trim();
    return district == null || district.isEmpty ? 'District not set' : district;
  }

  void _showHistory(
    BuildContext context,
    List<Complaint> items,
  ) => showModalBottomSheet(
    context: context,
    builder: (_) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Text(
          '${items.length} report${items.length == 1 ? '' : 's'} in your history.',
        ),
      ),
    ),
  );
}
