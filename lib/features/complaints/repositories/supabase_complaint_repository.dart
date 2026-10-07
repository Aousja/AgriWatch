import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/supabase_config.dart';
import '../../profile/models/user_profile.dart';
import '../models/complaint.dart';
import '../models/report_categories.dart';
import 'complaint_repository.dart';

const _complaintListColumns = '*';

/// Mobile complaints share the web dashboard's public.complaints table.
/// The database also checks the Firebase JWT subject for every own-row read.
class SupabaseComplaintRepository implements ComplaintRepository {
  SupabaseComplaintRepository({
    this.profile,
    this.clientOverride,
    FirebaseAuth? auth,
  }) : _auth = auth ?? FirebaseAuth.instance;

  final UserProfile? profile;
  final SupabaseClient? clientOverride;
  final FirebaseAuth _auth;

  SupabaseClient get client {
    if (!SupabaseConfig.isConfigured && clientOverride == null) {
      throw StateError('Supabase is required for complaint tracking.');
    }
    return clientOverride ?? Supabase.instance.client;
  }

  String get uid {
    final value = _auth.currentUser?.uid;
    if (value == null) throw StateError('Sign in to use complaints.');
    return value;
  }

  @override
  Future<List<Complaint>> getComplaints() async {
    final owner = uid;
    late final List<Map<String, dynamic>> rows;
    try {
      rows = await client
          .from('complaints')
          .select(_complaintListColumns)
          .eq('firebase_uid', owner)
          .order('created_at', ascending: false);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        String safe(Object? value) => (value?.toString() ?? 'null')
            .replaceAll(owner, '<firebase-uid>')
            .replaceAll(
              RegExp(
                r'[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
              ),
              '<token>',
            )
            .replaceAll(
              RegExp(r'Failing row contains[^\n]*', caseSensitive: false),
              '<row redacted>',
            )
            .replaceAll(
              RegExp(
                r'\b(?:apikey|authorization)\s*[:=]\s*[^\s;,]+',
                caseSensitive: false,
              ),
              '<credential redacted>',
            );
        debugPrint(
          '[SupabaseComplaint] list SELECT failed: '
          'code=${safe(error.code)}; message=${safe(error.message)}; '
          'details=${safe(error.details)}; hint=${safe(error.hint)}; '
          'columns=$_complaintListColumns; '
          'filter=firebase_uid:<current-user>; order=created_at DESC',
        );
      }
      rethrow;
    } on StateError {
      if (kDebugMode &&
          !SupabaseConfig.isConfigured &&
          clientOverride == null) {
        debugPrint(
          '[SupabaseComplaint] list SELECT not sent: '
          'Supabase is required for complaint tracking; '
          'urlConfigured=${SupabaseConfig.url.isNotEmpty}; '
          'publishableKeyConfigured=${SupabaseConfig.publishableKey.isNotEmpty}; '
          'columns=$_complaintListColumns',
        );
      }
      rethrow;
    }
    return rows.map((row) => Complaint.fromSupabase(row)).toList();
  }

  @override
  Future<Complaint> getComplaint(String complaintId) async {
    final owner = uid;
    final row = await client
        .from('complaints')
        .select()
        .eq('id', complaintId)
        .eq('firebase_uid', owner)
        .maybeSingle();
    if (row == null) throw StateError('Complaint not found.');
    return Complaint.fromSupabase(row);
  }

  @override
  Future<Complaint> submitComplaint({
    required String category,
    required String cropType,
    required String description,
    String? evidencePath,
  }) async {
    if (evidencePath != null) {
      throw StateError(
        'Photo evidence is not available in this complaint phase.',
      );
    }
    final owner = uid;
    final details = description.trim();
    // New reports require the reviewed M08 contract. Missing RPCs must fail
    // before inserting into an older database with broad complaint access.
    try {
      await client.rpc('agriwatch_report_access_v1');
    } on PostgrestException catch (error) {
      if (error.code == 'PGRST202' || error.code == '42883') {
        throw StateError(
          'Drought reporting requires the coordinated database rollout.',
        );
      }
      rethrow;
    }
    if (!droughtReportCategories.contains(category) ||
        profile?.district?.trim().isNotEmpty != true ||
        details.length < 10) {
      throw ArgumentError(
        'Choose a drought report category, set your district, and describe the situation.',
      );
    }
    final row = await client
        .from('complaints')
        .insert({
          'firebase_uid': owner,
          'reporter_name': profile?.name ?? _auth.currentUser?.displayName,
          'reporter_role': profile?.role == 'farmer' ? 'farmer' : 'public',
          'reporter_phone': profile?.phoneNumber,
          'district': profile?.district,
          'category': category.trim(),
          'crop_type': cropType.trim(),
          'description': details,
        })
        .select()
        .single();
    return Complaint.fromSupabase(row);
  }
}
