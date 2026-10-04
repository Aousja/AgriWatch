import 'package:firebase_auth/firebase_auth.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/user_profile.dart';

const _profileColumns =
    'firebase_uid, name, phone_number, email, photo_url, role, district, '
    'created_at, updated_at';

/// Maps the existing Flutter profile model to the new, Firebase-UID keyed
/// Supabase table without changing the Firestore representation.
class SupabaseProfileMapper {
  SupabaseProfileMapper._();

  static const _updateColumns = {
    'name': 'name',
    'phoneNumber': 'phone_number',
    'email': 'email',
    'photoUrl': 'photo_url',
    'district': 'district',
  };

  /// Client-created profiles may only select the existing farmer/citizen
  /// roles. The database RLS and column grants enforce this independently.
  static Map<String, dynamic> toInsert(UserProfile profile) {
    final role = profile.role == 'farmer' ? 'farmer' : 'citizen';
    return {
      'firebase_uid': profile.uid,
      'name': profile.name,
      'phone_number': profile.phoneNumber,
      'email': profile.email,
      'photo_url': profile.photoUrl,
      'role': role,
      'district': profile.district,
    };
  }

  /// Only fields currently permitted by UserProfileService are mapped. In
  /// particular, uid, role, createdAt, and updatedAt are never update inputs.
  static Map<String, dynamic> toUpdate(Map<String, dynamic> data) {
    return {
      for (final entry in data.entries)
        if (_updateColumns.containsKey(entry.key))
          _updateColumns[entry.key]!: entry.value,
    };
  }

  static UserProfile fromRow(Map<String, dynamic> row) {
    final uid = row['firebase_uid'];
    if (uid is! String || uid.isEmpty) {
      throw const FormatException('Supabase profile has no Firebase UID.');
    }

    return UserProfile.fromMap({
      'uid': uid,
      'name': row['name'],
      'phoneNumber': row['phone_number'],
      'email': row['email'],
      'photoUrl': row['photo_url'],
      'role': row['role'],
      'district': row['district'],
      'createdAt': row['created_at'],
      'updatedAt': row['updated_at'],
    });
  }
}

class SupabaseProfileRepository {
  SupabaseProfileRepository({
    SupabaseClient? client,
    FirebaseAuth? auth,
  }) : _client = client ?? Supabase.instance.client,
       _auth = auth ?? FirebaseAuth.instance;

  static const _table = 'mobile_firebase_profiles';

  final SupabaseClient _client;
  final FirebaseAuth _auth;

  String _requireCurrentUid(String requestedUid) {
    final currentUid = _auth.currentUser?.uid;
    if (currentUid == null) {
      throw StateError('You must be signed in to use Supabase profiles.');
    }
    if (currentUid != requestedUid) {
      throw StateError('A profile may only be accessed for the signed-in user.');
    }
    return currentUid;
  }

  Future<UserProfile?> fetchProfile(String uid) async {
    final currentUid = _requireCurrentUid(uid);
    final row = await _client
        .from(_table)
        .select(_profileColumns)
        .eq('firebase_uid', currentUid)
        .maybeSingle();

    return row == null ? null : SupabaseProfileMapper.fromRow(row);
  }

  Future<void> createProfile(UserProfile profile) async {
    _requireCurrentUid(profile.uid);
    await _client.from(_table).insert(SupabaseProfileMapper.toInsert(profile));
  }

  Future<void> updateProfile(String uid, Map<String, dynamic> data) async {
    final currentUid = _requireCurrentUid(uid);
    final update = SupabaseProfileMapper.toUpdate(data);
    if (update.isEmpty) return;

    await _client.from(_table).update(update).eq('firebase_uid', currentUid);
  }
}
