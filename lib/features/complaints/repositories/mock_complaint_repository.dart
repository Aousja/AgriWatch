import 'package:firebase_auth/firebase_auth.dart';
import '../models/complaint.dart';
import '../models/complaint_status.dart';
import 'complaint_repository.dart';

class MockComplaintRepository implements ComplaintRepository {
  MockComplaintRepository._();
  static final instance = MockComplaintRepository._();
  final List<Complaint> _items = [];

  String get _currentUserId =>
      FirebaseAuth.instance.currentUser?.uid ?? 'local-user';

  @override
  Future<List<Complaint>> getComplaints() async => List.unmodifiable(
    _items.where((complaint) => complaint.userId == _currentUserId),
  );

  @override
  Future<Complaint> getComplaint(String complaintId) async {
    return _items.firstWhere(
      (complaint) =>
          complaint.id == complaintId && complaint.userId == _currentUserId,
      orElse: () => throw StateError('Complaint not found.'),
    );
  }

  @override
  Future<Complaint> submitComplaint({
    required String category,
    required String cropType,
    required String description,
    String? evidencePath,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    final now = DateTime.now();
    final complaint = Complaint(
      id: now.microsecondsSinceEpoch.toString(),
      ticketId: 'AWW-${now.millisecond}${now.second}',
      userId: _currentUserId,
      title: category,
      description: description,
      category: category,
      cropType: cropType,
      district: '',
      location: '',
      imageUrls: evidencePath == null ? const [] : [evidencePath],
      status: ComplaintStatus.submitted,
      createdAt: now,
      updatedAt: now,
      timeline: [
        ComplaintEvent(
          title: 'Complaint Filed',
          description: 'Complaint received by AgriWatch.',
          date: now,
          isCurrent: true,
        ),
        const ComplaintEvent(
          title: 'Review Initiated',
          description: 'The team will review your report.',
        ),
        const ComplaintEvent(
          title: 'Resolution Process',
          description: 'Next steps will appear here.',
        ),
        const ComplaintEvent(
          title: 'Resolution Completed',
          description: 'We will notify you when resolved.',
        ),
      ],
    );
    _items.insert(0, complaint);
    return complaint;
  }
}
