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
import '../../../core/design/workflow_copy.dart';

class ComplaintsScreen extends StatefulWidget {
  final UserProfile? profile;
  final ComplaintService? service;
  final VoidCallback? onProfileUpdated;
  final bool history;

  const ComplaintsScreen({
    super.key,
    this.profile,
    this.service,
    this.onProfileUpdated,
    this.history = false,
  });
  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends State<ComplaintsScreen> {
  late final ComplaintService _service;
  UserProfile? _profile;
  ComplaintStatus? _status;
  bool get _history => widget.history;
  final _search = TextEditingController();
  late Future<List<Complaint>> _future;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? ComplaintService();
    _profile = widget.profile;
    _future = _service.getComplaints();
    _search.addListener(() => setState(() {}));
  }

  @override
  void didUpdateWidget(covariant ComplaintsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile != widget.profile) _profile = widget.profile;
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _reloadComplaints() async {
    final request = _service.getComplaints();
    setState(() {
      _future = request;
    });
    // FutureBuilder displays failure; pull-to-refresh must also finish on failure.
    try {
      await request;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        WorkflowCopy.text(
          _history ? 'Report history' : 'Drought report tracking',
        ),
      ),
      actions: [
        IconButton(
          onPressed: _reloadComplaints,
          icon: const Icon(Icons.refresh),
          tooltip: WorkflowCopy.text('Refresh reports'),
        ),
        IconButton(
          onPressed: () => _filter(context),
          icon: const Icon(Icons.tune),
          tooltip: WorkflowCopy.text('Filter'),
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
          return Center(
            child: SingleChildScrollView(
              child: EmptyState(
                icon: Icons.error_outline,
                title: WorkflowCopy.text('Could not load reports'),
                message: WorkflowCopy.text(
                  'Please check your connection and retry.',
                ),
                action: FilledButton(
                  onPressed: _reloadComplaints,
                  child: Text(WorkflowCopy.text('Retry')),
                ),
              ),
            ),
          );
        }
        final all = snapshot.data ?? <Complaint>[];
        final query = _search.text.trim().toLowerCase();
        final items = all
            .where(
              (c) =>
                  (_status == null || c.status == _status) &&
                  (c.ticketId.toLowerCase().contains(query) ||
                      c.title.toLowerCase().contains(query) ||
                      WorkflowCopy.text(c.title).toLowerCase().contains(query)),
            )
            .toList();
        final active = all
            .where(
              (c) =>
                  c.status != ComplaintStatus.resolved &&
                  c.status != ComplaintStatus.rejected,
            )
            .length;
        return RefreshIndicator(
          onRefresh: _reloadComplaints,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: AppDesign.pagePadding.copyWith(top: 4, bottom: 28),
            children: [
              TextField(
                controller: _search,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: WorkflowCopy.text(
                    'Search by Ticket ID or Topic...',
                  ),
                  suffixIcon: IconButton(
                    onPressed: _search.clear,
                    tooltip: WorkflowCopy.text('Clear search'),
                    icon: const Icon(Icons.clear),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              if (_status != null)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: InputChip(
                    label: Text(WorkflowCopy.text(_status!.label)),
                    onDeleted: () => setState(() => _status = null),
                  ),
                ),
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
                  Expanded(
                    child: Text(
                      WorkflowCopy.text(
                        _history ? 'Report history' : 'RECENT SUBMISSIONS',
                      ),
                      style: const TextStyle(
                        color: AppDesign.muted,
                        fontSize: 12,
                        letterSpacing: 1,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (!_history)
                    TextButton(
                      onPressed: () => _showHistory(context, all),
                      child: Text(WorkflowCopy.text('View History')),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              if (all.isEmpty)
                EmptyState(
                  icon: Icons.assignment_outlined,
                  title: WorkflowCopy.text('No drought reports yet'),
                  message: WorkflowCopy.text(
                    'Your drought reports and recorded updates will appear here.',
                  ),
                  action: FilledButton.icon(
                    onPressed: () => _openSubmit(context),
                    icon: const Icon(Icons.add),
                    label: Text(WorkflowCopy.text('Report Drought Situation')),
                  ),
                )
              else if (items.isEmpty)
                EmptyState(
                  icon: Icons.search_off,
                  title: WorkflowCopy.text('No matching reports'),
                  message: WorkflowCopy.text(
                    'Try another ticket ID, topic, or status.',
                  ),
                  action: TextButton(
                    onPressed: () {
                      _search.clear();
                      setState(() => _status = null);
                    },
                    child: Text(WorkflowCopy.text('Clear search and filters')),
                  ),
                )
              else
                ...items.map(
                  (c) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: ComplaintCard(
                      complaint: c,
                      district: c.district.isEmpty
                          ? _districtLabel
                          : c.district,
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ComplaintDetailScreen(
                              complaintId: c.id,
                              profile: _profile,
                              service: _service,
                            ),
                          ),
                        );
                        if (mounted) _reloadComplaints();
                      },
                    ),
                  ),
                ),
              if (all.isNotEmpty) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => _openSubmit(context),
                  icon: const Icon(Icons.add),
                  label: Text(WorkflowCopy.text('Report Drought Situation')),
                ),
              ],
            ],
          ),
        );
      },
    ),
  );

  Future<void> _filter(BuildContext context) async {
    final choice = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(WorkflowCopy.text('Filter by status')),
              ),
              ListTile(
                title: Text(WorkflowCopy.text('All statuses')),
                selected: _status == null,
                onTap: () => Navigator.pop(sheetContext, -1),
              ),
              ...ComplaintStatus.values.map(
                (status) => ListTile(
                  title: Text(WorkflowCopy.text(status.label)),
                  selected: _status == status,
                  onTap: () => Navigator.pop(sheetContext, status.index),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (!mounted || choice == null) return;
    setState(
      () => _status = choice == -1 ? null : ComplaintStatus.values[choice],
    );
  }

  void _openSubmit(BuildContext context) {
    Navigator.of(context)
        .push(
          MaterialPageRoute(
            builder: (_) => SubmitComplaintScreen(
              profile: _profile,
              service: widget.service,
              onProfileChanged: (profile) {
                if (mounted) setState(() => _profile = profile);
                widget.onProfileUpdated?.call();
              },
            ),
          ),
        )
        .then((_) {
          if (mounted) _reloadComplaints();
        });
  }

  String get _districtLabel {
    final district = _profile?.district?.trim();
    return district == null || district.isEmpty
        ? WorkflowCopy.text('District not set')
        : district;
  }

  Future<void> _showHistory(BuildContext context, List<Complaint> items) async {
    // Use a real tracking route: every historical card opens the same details.
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ComplaintsScreen(
          profile: _profile,
          service: widget.service,
          onProfileUpdated: widget.onProfileUpdated,
          history: true,
        ),
      ),
    );
    if (mounted) _reloadComplaints();
  }
}
