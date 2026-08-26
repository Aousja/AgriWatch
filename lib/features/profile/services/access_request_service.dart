import 'package:cloud_firestore/cloud_firestore.dart';

class AccessRequestService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _requests =>
      _firestore.collection('access_requests');

  Future<bool> hasPendingRequest(String uid) async {
    final snapshot = await _requests
        .where('uid', isEqualTo: uid)
        .where('status', isEqualTo: 'pending')
        .limit(1)
        .get();
    return snapshot.docs.isNotEmpty;
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
