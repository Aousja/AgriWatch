import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/user_profile.dart';

class UserProfileService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> get _profilesCollection =>
      _firestore.collection('user_profiles');

  Future<void> createProfile(UserProfile profile) async {
    final now = DateTime.now();
    final profileData = UserProfile(
      uid: profile.uid,
      name: profile.name,
      phoneNumber: profile.phoneNumber,
      email: profile.email,
      photoUrl: profile.photoUrl,
      role: 'citizen',
      district: profile.district,
      createdAt: profile.createdAt ?? now,
      updatedAt: now,
    );

    await _profilesCollection.doc(profile.uid).set(profileData.toMap());
  }

  Future<UserProfile?> fetchProfile(String uid) async {
    final snapshot = await _profilesCollection.doc(uid).get();

    if (!snapshot.exists || snapshot.data() == null) {
      return null;
    }

    return UserProfile.fromMap(snapshot.data()!);
  }

  Future<bool> profileExists(String uid) async {
    final snapshot = await _profilesCollection.doc(uid).get();
    return snapshot.exists;
  }

  Future<void> updateProfile(String uid, Map<String, dynamic> data) async {
    final allowedData = <String, dynamic>{
      for (final entry in data.entries)
        if ({'name', 'phoneNumber', 'email', 'photoUrl', 'district'}
            .contains(entry.key))
          entry.key: entry.value,
    };

    await _profilesCollection.doc(uid).update({
      ...allowedData,
      'role': 'citizen',
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
