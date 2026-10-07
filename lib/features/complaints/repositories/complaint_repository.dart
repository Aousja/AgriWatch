import '../models/complaint.dart';

abstract class ComplaintRepository {
  Future<List<Complaint>> getComplaints();
  Future<Complaint> getComplaint(String complaintId);
  Future<Complaint> submitComplaint({
    required String category,
    required String cropType,
    required String description,
    String? evidencePath,
  });
}
