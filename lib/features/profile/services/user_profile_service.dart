import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../core/config/supabase_config.dart';
import '../models/user_profile.dart';
import '../repositories/supabase_profile_repository.dart';
import '../../auth/services/application_role.dart';

class UserProfileService {
  UserProfileService({FirebaseFirestore? firestore, FirebaseAuth? auth})
    : _firestore = firestore ?? FirebaseFirestore.instance,
      _auth = auth ?? FirebaseAuth.instance;
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;
  SupabaseProfileRepository? _supabaseRepository;

  CollectionReference<Map<String, dynamic>> get _profilesCollection =>
      _firestore.collection('user_profiles');

  SupabaseProfileRepository get _newProfileRepository =>
      _supabaseRepository ??= SupabaseProfileRepository();

  static UserProfile profileForCreation(UserProfile profile, {DateTime? now}) {
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

    // Creation may be retried after a lost response. Never overwrite an
    // existing profile (including its role) with setup defaults.
    await _firestore.runTransaction((transaction) async {
      final reference = _profilesCollection.doc(profile.uid);
      final existing = await transaction.get(reference);
      if (!existing.exists) transaction.set(reference, profileData.toMap());
    });
  }

  Future<UserProfile?> fetchProfile(
    String uid, {
    bool forceRefresh = false,
  }) async {
    final user = _auth.currentUser;
    if (user == null || user.uid != uid || user.isAnonymous) {
      throw StateError('Sign in with a verified account to load your profile.');
    }
    final token = await user.getIdTokenResult(forceRefresh);
    UserProfile? profile;
    if (SupabaseConfig.useSupabaseProfiles) {
      profile = await _newProfileRepository.fetchProfile(uid);
    } else {
      // An offline cache miss is not evidence that the account has no profile.
      final snapshot = await _profilesCollection
          .doc(uid)
          .get(const GetOptions(source: Source.server));
      if (snapshot.exists && snapshot.data() != null) {
        profile = UserProfile.fromMap(snapshot.data()!);
      }
    }
    if (profile == null) return null;
    return UserProfile(
      uid: profile.uid,
      name: profile.name,
      phoneNumber: profile.phoneNumber,
      email: profile.email,
      photoUrl: profile.photoUrl,
      district: profile.district,
      role: ApplicationRole.effective(profile.role, token.claims),
      accessGranted: ApplicationRole.trusted(token.claims) != null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    );
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
        if ({
          'name',
          'phoneNumber',
          'email',
          'photoUrl',
          'district',
        }.contains(entry.key))
          entry.key: entry.value,
    };

    await _profilesCollection.doc(uid).update({
      ...allowedData,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}
