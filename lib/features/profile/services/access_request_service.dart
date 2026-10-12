import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/config/supabase_config.dart';
import '../repositories/supabase_access_request_repository.dart';

class AccessRequestService {
  AccessRequestService({
    FirebaseFirestore? firestore,
    this._supabaseRepository,
  }) : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;
  SupabaseAccessRequestRepository? _supabaseRepository;

  SupabaseAccessRequestRepository get _newSupabaseRepository =>
      _supabaseRepository ??= SupabaseAccessRequestRepository();

  CollectionReference<Map<String, dynamic>> get _requests =>
      _firestore.collection('access_requests');

  Future<bool> hasPendingRequest(String uid) async {
    if (SupabaseConfig.useSupabaseAccessRequests) {
      return _newSupabaseRepository.hasPendingRequest(uid);
    }

    final snapshot = await _requests
        .where('uid', isEqualTo: uid)
        .where('status', isEqualTo: 'pending')
        .limit(1)
        .get();
    return snapshot.docs.isNotEmpty;
  }

  Future<Map<String, dynamic>?> latestRequest(String uid) async {
    if (SupabaseConfig.useSupabaseAccessRequests) {
      return _newSupabaseRepository.latestOwnRequest(uid);
    }

    final snapshot = await _requests
        .where('uid', isEqualTo: uid)
        .get();
    // Filter ownership on the server; order the user's rows locally so this
    // read does not require a composite index or a database rollout.
    return latestOwnRequest(uid, snapshot.docs.map((doc) => doc.data()));
  }

  static Map<String, dynamic>? latestOwnRequest(
    String uid,
    Iterable<Map<String, dynamic>> rows,
  ) {
    int submittedAt(Map<String, dynamic> row) {
      final value = row['submittedAt'];
      return value is Timestamp ? value.millisecondsSinceEpoch : 0;
    }
    final own = rows.where((row) => row['uid'] == uid).toList()
      ..sort((a, b) => submittedAt(b).compareTo(submittedAt(a)));
    return own.isEmpty ? null : own.first;
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
    if (SupabaseConfig.useSupabaseAccessRequests) {
      await _newSupabaseRepository.submitRequest(
        uid: uid,
        requestedRole: requestedRole,
        fullName: fullName,
        organizationName: organizationName,
        designation: designation,
        phone: phone,
        reason: reason,
        additionalFields: additionalFields,
      );
      return;
    }

    await _requests.add({
      'uid': uid,
      'requestedRole': requestedRole,
      'fullName': fullName,
      'organizationName': organizationName,
      'designation': designation,
      'phone': phone,
      'reason': reason,
      'status': 'pending',
      'submittedAt': FieldValue.serverTimestamp(),
      ...additionalFields,
    });
  }
}
