import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/config/supabase_config.dart';
import '../models/user_profile.dart';
import '../repositories/supabase_profile_repository.dart';

class UserProfileService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  SupabaseProfileRepository? _supabaseRepository;

  CollectionReference<Map<String, dynamic>> get _profilesCollection =>
      _firestore.collection('user_profiles');

  SupabaseProfileRepository get _newProfileRepository =>
      _supabaseRepository ??= SupabaseProfileRepository();

  static UserProfile profileForCreation(
    UserProfile profile, {
    DateTime? now,
  }) {
    final timestamp = now ?? DateTime.now();
    final createdAt = profile.createdAt ?? timestamp;
    final role = profile.role == 'farmer' ? 'farmer' : 'citizen';

    return UserProfile(
      uid: profile.uid,
      name: profile.name,
      phoneNumber: profile.phoneNumber,
      email: profile.email,
      photoUrl: profile.photoUrl,
      role: role,
      district: profile.district,
      createdAt: createdAt,
      updatedAt: timestamp,
    );
  }

  Future<void> createProfile(UserProfile profile) async {
    if (SupabaseConfig.useSupabaseProfiles) {
      await _newProfileRepository.createProfile(profile);
      return;
    }

    final profileData = profileForCreation(profile);

    await _profilesCollection.doc(profile.uid).set(profileData.toMap());
  }

  Future<UserProfile?> fetchProfile(String uid) async {
    if (SupabaseConfig.useSupabaseProfiles) {
      return _newProfileRepository.fetchProfile(uid);
    }

    final snapshot = await _profilesCollection.doc(uid).get();

    if (!snapshot.exists || snapshot.data() == null) {
      return null;
    }

    return UserProfile.fromMap(snapshot.data()!);
  }

  Future<bool> profileExists(String uid) async {
    if (SupabaseConfig.useSupabaseProfiles) {
      return await fetchProfile(uid) != null;
    }

    final snapshot = await _profilesCollection.doc(uid).get();
    return snapshot.exists;
  }

  Future<void> updateProfile(String uid, Map<String, dynamic> data) async {
    if (SupabaseConfig.useSupabaseProfiles) {
      await _newProfileRepository.updateProfile(uid, data);
      return;
    }

    final allowedData = <String, dynamic>{
      for (final entry in data.entries)
        if ({'name', 'phoneNumber', 'email', 'photoUrl', 'district'}
            .contains(entry.key))
          entry.key: entry.value,
    };

    await _profilesCollection.doc(uid).update({
      ...allowedData,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
