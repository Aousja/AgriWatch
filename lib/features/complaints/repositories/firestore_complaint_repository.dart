import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';

import '../../profile/models/user_profile.dart';
import '../models/complaint.dart';
import 'complaint_repository.dart';

class FirestoreComplaintRepository implements ComplaintRepository {
  FirestoreComplaintRepository({
    this.profile,
    FirebaseFirestore? firestore,
    FirebaseStorage? storage,
  }) : _firestore = firestore ?? FirebaseFirestore.instance,
       _storage = storage ?? FirebaseStorage.instance;

  final UserProfile? profile;
  final FirebaseFirestore _firestore;
  final FirebaseStorage _storage;

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore.collection('complaints');

  User get _currentUser {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw StateError('You must be signed in to use complaints.');
    }
    return user;
  }

  @override
  Future<List<Complaint>> getComplaints() async {
    final uid = _currentUser.uid;
    final snapshot = await _collection
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .get();
    return snapshot.docs.map(Complaint.fromFirestore).toList();
  }

  @override
  Future<Complaint> getComplaint(String complaintId) async {
    final snapshot = await _collection.doc(complaintId).get();
    if (!snapshot.exists || snapshot.data() == null) {
      throw StateError('Complaint not found.');
    }
    return Complaint.fromFirestore(snapshot);
  }

  @override
  Future<Complaint> submitComplaint({
    required String category,
    required String cropType,
    required String description,
    String? evidencePath,
  }) async {
    final user = _currentUser;
    final district = profile?.district?.trim() ?? '';
    final now = DateTime.now();
    final ticketId = 'AWW-${now.millisecond}${now.second}';
    final docRef = _collection.doc();

    Reference? uploadedEvidence;
    String? evidenceImageUrl;

    try {
      if (evidencePath != null && evidencePath.trim().isNotEmpty) {
        final extension = _extensionFor(evidencePath);
        final evidenceFile = File(evidencePath.trim());
        if (!await evidenceFile.exists()) {
          throw StateError(
            'The selected evidence image is no longer available. Please choose it again.',
          );
        }

        final evidenceRef = _storage
            .ref()
            .child('complaint_evidence')
            .child(user.uid)
            .child('${docRef.id}.$extension');
        final uploadSnapshot = await evidenceRef.putFile(
          evidenceFile,
          SettableMetadata(contentType: _contentTypeFor(extension)),
        );
        uploadedEvidence = uploadSnapshot.ref;
        evidenceImageUrl = await _downloadUrlAfterUpload(uploadSnapshot.ref);
      }

      await docRef.set({
        'uid': user.uid,
        'ticketId': ticketId,
        'category': category,
        'cropType': cropType,
        'description': description,
        'district': district,
        'status': 'submitted',
        'evidenceImageUrl': evidenceImageUrl,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      return getComplaint(docRef.id);
    } catch (_) {
      if (uploadedEvidence != null) {
        try {
          await uploadedEvidence.delete();
        } catch (_) {
          // Preserve the original submit error if cleanup is not possible.
        }
      }
      rethrow;
    }
  }

  Future<String> _downloadUrlAfterUpload(Reference reference) async {
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        return await reference.getDownloadURL();
      } on FirebaseException catch (error) {
        if (error.code != 'object-not-found' || attempt == 2) rethrow;
        await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
      }
    }
    throw StateError('Could not get the uploaded evidence URL.');
  }

  String _extensionFor(String path) {
    final name = path.split(RegExp(r'[\\/]')).last;
    final dot = name.lastIndexOf('.');
    final extension = dot == -1 ? 'jpg' : name.substring(dot + 1).toLowerCase();
    return const {
          'jpg',
          'jpeg',
          'png',
          'webp',
          'heic',
          'heif',
        }.contains(extension)
        ? extension
        : 'jpg';
  }

  String _contentTypeFor(String extension) => switch (extension) {
    'png' => 'image/png',
    'webp' => 'image/webp',
    'heic' => 'image/heic',
    'heif' => 'image/heif',
    _ => 'image/jpeg',
  };
}
