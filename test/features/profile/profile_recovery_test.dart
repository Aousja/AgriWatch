// Test doubles only: SDK handles are annotated sealed/immutable for consumers.
// No application code subclasses those handles.
// ignore_for_file: subtype_of_sealed_class, must_be_immutable

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:agriwatch/features/profile/models/user_profile.dart';
import 'package:agriwatch/features/profile/services/user_profile_service.dart';

class Token extends Fake implements IdTokenResult {
  @override
  Map<String, dynamic>? get claims => {'role': 'authenticated'};
}

class Account extends Fake implements User {
  @override
  String get uid => 'returning-account';
  @override
  bool get isAnonymous => false;
  @override
  Future<IdTokenResult> getIdTokenResult([bool forceRefresh = false]) async =>
      Token();
}

class Auth extends Fake implements FirebaseAuth {
  @override
  User? get currentUser => Account();
}

class Snapshot extends Fake implements DocumentSnapshot<Map<String, dynamic>> {
  final Map<String, dynamic>? value;
  Snapshot(this.value);
  @override
  bool get exists => value != null;
  @override
  Map<String, dynamic>? data() => value;
}

class Reference extends Fake
    implements DocumentReference<Map<String, dynamic>> {
  Map<String, dynamic>? value;
  bool failRead = false;
  GetOptions? options;
  @override
  Future<DocumentSnapshot<Map<String, dynamic>>> get([
    GetOptions? options,
  ]) async {
    this.options = options;
    if (failRead) throw StateError('network unavailable');
    return Snapshot(value);
  }
}

class Profiles extends Fake
    implements CollectionReference<Map<String, dynamic>> {
  final Reference reference;
  String? requestedUid;
  Profiles(this.reference);
  @override
  DocumentReference<Map<String, dynamic>> doc([String? path]) {
    requestedUid = path;
    return reference;
  }
}

class Writes extends Fake implements Transaction {
  final Reference reference;
  int sets = 0;
  Writes(this.reference);
  @override
  Future<DocumentSnapshot<T>> get<T extends Object?>(
    DocumentReference<T> documentReference,
  ) async {
    if (reference.failRead) throw StateError('network unavailable');
    return Snapshot(reference.value) as DocumentSnapshot<T>;
  }

  @override
  Transaction set<T>(
    DocumentReference<T> documentReference,
    T data, [
    SetOptions? options,
  ]) {
    sets++;
    reference.value = data as Map<String, dynamic>;
    return this;
  }
}

class Database extends Fake implements FirebaseFirestore {
  final Reference reference = Reference();
  late final Profiles profiles = Profiles(reference);
  late final Writes writes = Writes(reference);
  @override
  CollectionReference<Map<String, dynamic>> collection(String path) {
    expect(path, 'user_profiles');
    return profiles;
  }

  @override
  Future<T> runTransaction<T>(
    TransactionHandler<T> transactionHandler, {
    Duration timeout = const Duration(seconds: 30),
    int maxAttempts = 5,
  }) => transactionHandler(writes);
}

void main() {
  test(
    'returning user reads exact UID from server and recovers existing profile',
    () async {
      final database = Database();
      database.reference.value = {
        'uid': 'returning-account',
        'name': 'Existing name',
        'role': 'farmer',
        'district': 'Tharparkar',
      };
      final service = UserProfileService(firestore: database, auth: Auth());
      final profile = await service.fetchProfile('returning-account');
      expect(profile!.name, 'Existing name');
      expect(profile.district, 'Tharparkar');
      expect(database.profiles.requestedUid, 'returning-account');
      expect(database.reference.options!.source, Source.server);
      expect(database.writes.sets, 0);
    },
  );

  test(
    'failed server read throws instead of returning missing profile',
    () async {
      final database = Database();
      database.reference.failRead = true;
      final service = UserProfileService(firestore: database, auth: Auth());
      await expectLater(
        service.fetchProfile('returning-account'),
        throwsStateError,
      );
      expect(database.writes.sets, 0);
    },
  );

  test(
    'setup retry does not overwrite an existing name, district or role',
    () async {
      final database = Database();
      database.reference.value = {
        'uid': 'returning-account',
        'name': 'Recovered name',
        'role': 'ngo',
        'district': 'Existing district',
      };
      final service = UserProfileService(firestore: database, auth: Auth());
      await service.createProfile(
        const UserProfile(
          uid: 'returning-account',
          name: 'New defaults',
          role: 'citizen',
        ),
      );
      expect(database.writes.sets, 0);
      expect(database.reference.value!['role'], 'ngo');
      expect(database.reference.value!['name'], 'Recovered name');
    },
  );

  test(
    'profile creation failure writes nothing; repeated creation writes once',
    () async {
      final database = Database();
      final service = UserProfileService(firestore: database, auth: Auth());
      const profile = UserProfile(
        uid: 'returning-account',
        name: 'Farmer',
        role: 'farmer',
      );
      database.reference.failRead = true;
      await expectLater(service.createProfile(profile), throwsStateError);
      expect(database.writes.sets, 0);
      database.reference.failRead = false;
      await service.createProfile(profile);
      await service.createProfile(profile);
      expect(database.writes.sets, 1);
      expect(database.reference.value!['role'], 'farmer');
    },
  );
}
