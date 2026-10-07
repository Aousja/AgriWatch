import 'package:cloud_firestore/cloud_firestore.dart';

import 'complaint_status.dart';

class ComplaintEvent {
  final String title, description;
  final DateTime? date;
  final bool isCurrent;
  const ComplaintEvent({
    required this.title,
    required this.description,
    this.date,
    this.isCurrent = false,
  });
}

class Complaint {
  final String id,
      ticketId,
      userId,
      title,
      description,
      category,
      cropType,
      district,
      location;
  final List<String> imageUrls;
  final String? evidenceImageUrl;
  final ComplaintStatus status;
  final String? assignedOfficer;
  final String? resolutionNote;
  final bool responseFromAdmin;
  final DateTime createdAt, updatedAt;
  final List<ComplaintEvent> timeline;

  const Complaint({
    required this.id,
    required this.ticketId,
    required this.userId,
    required this.title,
    required this.description,
    required this.category,
    required this.cropType,
    required this.district,
    required this.location,
    this.imageUrls = const [],
    this.evidenceImageUrl,
    required this.status,
    this.assignedOfficer,
    this.resolutionNote,
    this.responseFromAdmin = false,
    required this.createdAt,
    required this.updatedAt,
    required this.timeline,
  });

  factory Complaint.fromSupabase(Map<String, dynamic> row) {
    final createdAt =
        DateTime.tryParse(row['created_at']?.toString() ?? '') ??
        DateTime.now();
    final updatedAt =
        DateTime.tryParse(row['updated_at']?.toString() ?? '') ?? createdAt;
    final reviewStarted = DateTime.tryParse(
      row['review_started_at']?.toString() ?? '',
    );
    final assigned = DateTime.tryParse(
      row['pdma_assigned_at']?.toString() ?? '',
    );
    final resolved = DateTime.tryParse(row['resolved_at']?.toString() ?? '');
    final rawStatus = ComplaintStatusX.fromValue(row['status']);
    // Under Review was also the old insert default: it proves no review action.
    final status = resolved != null || rawStatus == ComplaintStatus.resolved
        ? ComplaintStatus.resolved
        : assigned != null && row['pdma_assigned_to'] != null
        ? ComplaintStatus.assigned
        : reviewStarted != null
        ? ComplaintStatus.underReview
        : row['status'] == 'Under Review' ||
              row['status'] == 'Assigned for PDMA review'
        ? ComplaintStatus.submitted
        : rawStatus;
    final category = row['category']?.toString() ?? 'Unspecified category';
    return Complaint(
      id: row['id'].toString(),
      ticketId: row['ref']?.toString() ?? row['id'].toString(),
      userId: row['firebase_uid']?.toString() ?? '',
      title: category,
      description: row['description']?.toString() ?? '',
      category: category,
      cropType: row['crop_type']?.toString() ?? '',
      district: row['district']?.toString() ?? '',
      location: '',
      status: status,
      assignedOfficer: row['pdma_assigned_to']?.toString(),
      resolutionNote: row['resolution_note']?.toString(),
      responseFromAdmin: row['admin_responded_at'] != null,
      evidenceImageUrl: row['photo_url']?.toString(),
      createdAt: createdAt,
      updatedAt: updatedAt,
      timeline: [
        ComplaintEvent(
          title: 'Report received',
          description: 'Recorded for AgriWatch admin review.',
          date: createdAt,
        ),
        if (reviewStarted != null)
          ComplaintEvent(
            title: 'AgriWatch review started',
            description: 'An admin recorded a review action.',
            date: reviewStarted,
          ),
        if (assigned != null && row['pdma_assigned_to'] != null)
          ComplaintEvent(
            title: 'Assigned for PDMA review',
            description:
                'An admin explicitly assigned this report to a verified PDMA reviewer. This does not confirm government action.',
            date: assigned,
          ),
        if (resolved != null)
          ComplaintEvent(
            title: 'Resolution recorded',
            description: 'An admin recorded resolution.',
            date: resolved,
          ),
        if (resolved == null && rawStatus == ComplaintStatus.resolved)
          const ComplaintEvent(
            title: 'Legacy resolution status',
            description:
                'The stored status is Resolved; no completion time was recorded.',
            isCurrent: true,
          ),
        if (rawStatus == ComplaintStatus.legacyForwarded && assigned == null)
          const ComplaintEvent(
            title: 'Legacy status: Forwarded',
            description:
                'No verified PDMA assignment is recorded by this status alone.',
            isCurrent: true,
          ),
        if (reviewStarted == null && status == ComplaintStatus.submitted)
          const ComplaintEvent(
            title: 'Awaiting AgriWatch review',
            description: 'No review action has been recorded yet.',
            isCurrent: true,
          ),
      ],
    );
  }

  factory Complaint.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
  ) {
    final data = snapshot.data() ?? <String, dynamic>{};
    final createdAt = _dateFromValue(data['createdAt']) ?? DateTime.now();
    final updatedAt = _dateFromValue(data['updatedAt']) ?? createdAt;
    final category = data['category'] as String? ?? 'Complaint';
    final evidenceImageUrl = data['evidenceImageUrl'] as String?;
    final status = ComplaintStatusX.fromValue(data['status']);

    return Complaint(
      id: snapshot.id,
      ticketId: data['ticketId'] as String? ?? snapshot.id,
      userId: data['uid'] as String? ?? '',
      title: category,
      description: data['description'] as String? ?? '',
      category: category,
      cropType: data['cropType'] as String? ?? '',
      district: data['district'] as String? ?? '',
      location: '',
      imageUrls: evidenceImageUrl == null ? const [] : [evidenceImageUrl],
      evidenceImageUrl: evidenceImageUrl,
      status: status,
      createdAt: createdAt,
      updatedAt: updatedAt,
      timeline: _timeline(status, createdAt),
    );
  }

  static DateTime? _dateFromValue(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }

  static List<ComplaintEvent> _timeline(
    ComplaintStatus status,
    DateTime createdAt,
  ) => [
    ComplaintEvent(
      title: 'Report received',
      description: 'Report recorded by AgriWatch.',
      date: createdAt,
      isCurrent: status == ComplaintStatus.submitted,
    ),
  ];
}
