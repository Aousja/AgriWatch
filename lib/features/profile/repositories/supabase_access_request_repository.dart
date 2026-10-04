import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _accessRequestColumns = '''
id,
firebase_uid,
name,
role,
district,
phone,
status,
submitted_at,
organization_name,
designation,
reason,
cnic,
province,
department,
employee_id,
official_email,
organization_type,
registration_number,
operational_province,
operational_district
''';

/// Converts the existing Firestore form contract to the proposed shared
/// access_requests columns. Status and submitted_at are server-controlled.
class SupabaseAccessRequestMapper {
  SupabaseAccessRequestMapper._();

  static const clientRoles = {'officer', 'ngo'};

  static Map<String, dynamic> toInsert({
    required String uid,
    required String requestedRole,
    required String fullName,
    required String organizationName,
    required String designation,
    required String phone,
    required String reason,
    Map<String, dynamic> additionalFields = const {},
  }) {
    if (uid.trim().isEmpty) {
      throw ArgumentError.value(uid, 'uid', 'Firebase UID is required.');
    }
    if (!clientRoles.contains(requestedRole)) {
      throw ArgumentError.value(
        requestedRole,
        'requestedRole',
        'Only officer and ngo access requests may be submitted by mobile.',
      );
    }

    final row = <String, dynamic>{
      'firebase_uid': uid,
      'name': fullName,
      'role': requestedRole,
      'phone': phone,
      'organization_name': organizationName,
      'designation': designation,
      'reason': reason,
    };

    if (requestedRole == 'officer') {
      row.addAll({
        'district': additionalFields['district'],
        'cnic': additionalFields['cnic'],
        'province': additionalFields['province'],
        'department': additionalFields['department'],
        'employee_id': additionalFields['employeeId'],
        'official_email': additionalFields['officialEmail'],
      });
    } else {
      row.addAll({
        'district': additionalFields['operationalDistrict'],
        'organization_type': additionalFields['organizationType'],
        'registration_number': additionalFields['registrationNumber'],
        'operational_province': additionalFields['operationalProvince'],
        'operational_district': additionalFields['operationalDistrict'],
        'official_email': additionalFields['officialEmail'],
      });
    }

    return row;
  }
}

class SupabaseAccessRequestRepository {
  SupabaseAccessRequestRepository({
    SupabaseClient? client,
    FirebaseAuth? auth,
  })  : _client = client ?? Supabase.instance.client,
        _auth = auth ?? FirebaseAuth.instance;

  static const _table = 'access_requests';

  final SupabaseClient _client;
  final FirebaseAuth _auth;

  String _requireCurrentUid(String requestedUid) {
    final currentUid = _auth.currentUser?.uid;
    if (currentUid == null) {
      throw StateError(
        'You must be signed in to use Supabase access requests.',
      );
    }
    if (currentUid != requestedUid) {
      throw StateError(
        'An access request may only be accessed for the signed-in user.',
      );
    }
    return currentUid;
  }

  Future<bool> hasPendingRequest(String uid) async {
    final rows = await listOwnRequests(uid, status: 'pending');
    return rows.isNotEmpty;
  }

  Future<List<Map<String, dynamic>>> listOwnRequests(
    String uid, {
    String? status,
  }) async {
    final currentUid = _requireCurrentUid(uid);
    var query = _client
        .from(_table)
        .select(_accessRequestColumns)
        .eq('firebase_uid', currentUid);

    if (status != null) {
      query = query.eq('status', status);
    }

    late final List<Map<String, dynamic>> rows;
    try {
      rows = await query.order('submitted_at', ascending: false);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint(
          '[SupabaseAccessRequest] own status SELECT failed: '
          'code=${error.code}; message=${error.message}; '
          'details=${error.details}; hint=${error.hint}; '
          'query=public.access_requests SELECT '
          '(${_accessRequestColumns.replaceAll(RegExp(r'\s+'), ' ').trim()}) '
          'WHERE firebase_uid=<current-firebase-uid> '
          'AND status=${status ?? '<any>'} '
          'ORDER BY submitted_at DESC',
        );
      }
      rethrow;
    }
    return rows
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }

  Future<void> submitRequest({
    required String uid,
    required String requestedRole,
    required String fullName,
    required String organizationName,
    required String designation,
    required String phone,
    required String reason,
    Map<String, dynamic> additionalFields = const {},
  }) async {
    final currentUid = _requireCurrentUid(uid);
    final row = SupabaseAccessRequestMapper.toInsert(
      uid: currentUid,
      requestedRole: requestedRole,
      fullName: fullName,
      organizationName: organizationName,
      designation: designation,
      phone: phone,
      reason: reason,
      additionalFields: additionalFields,
    );

    await _client.from(_table).insert(row);
  }
}
