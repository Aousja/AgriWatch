import '../models/complaint.dart';
import '../../profile/models/user_profile.dart';
import '../repositories/complaint_repository.dart';
import '../repositories/supabase_complaint_repository.dart';

class ComplaintService {
  ComplaintService({ComplaintRepository? repository, UserProfile? profile})
    : _repository = repository ?? SupabaseComplaintRepository(profile: profile);
  final ComplaintRepository _repository;
  Future<List<Complaint>> getComplaints() => _repository.getComplaints();
  Future<Complaint> getComplaint(String complaintId) =>
      _repository.getComplaint(complaintId);
  Future<Complaint> submit({
    required String category,
    required String cropType,
    required String description,
    String? evidencePath,
  }) => _repository.submitComplaint(
    category: category,
    cropType: cropType,
    description: description,
    evidencePath: evidencePath,
  );
}
