import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:agriwatch/features/profile/models/user_profile.dart';
import 'package:agriwatch/features/profile/services/user_profile_service.dart';

void main() {
  final createdAt = DateTime(2026, 10, 4, 12, 30);
  final updatedAt = DateTime(2026, 10, 4, 12, 45);

  group('UserProfile role serialization', () {
    test('preserves farmer and citizen roles', () {
      final farmer = UserProfile(uid: 'farmer-1', role: 'farmer');
      final citizen = UserProfile(uid: 'citizen-1', role: 'citizen');

      expect(farmer.toMap()['role'], 'farmer');
      expect(citizen.toMap()['role'], 'citizen');
      expect(UserProfile.fromMap(farmer.toMap()).role, 'farmer');
      expect(UserProfile.fromMap(citizen.toMap()).role, 'citizen');
    });

    test('preserves existing elevated roles when reading and serializing', () {
      for (final role in ['admin', 'pdma_officer']) {
        final profile = UserProfile.fromMap({'uid': role, 'role': role});

        expect(profile.role, role);
        expect(profile.toMap()['role'], role);
      }
    });

    test('falls back unknown roles to citizen', () {
      final profile = UserProfile.fromMap({
        'uid': 'unknown-role',
        'role': 'self_assigned_admin',
      });

      expect(profile.role, 'citizen');

      final ngoProfile = UserProfileService.profileForCreation(
        UserProfile(uid: 'user-ngo-1', role: 'ngo'),
        now: updatedAt,
      );

      expect(ngoProfile.role, 'citizen');
    });
  });

  group('UserProfileService profile creation', () {
    test('keeps farmer selection for new profiles', () {
      final profile = UserProfileService.profileForCreation(
        UserProfile(
          uid: 'farmer-1',
          role: 'farmer',
          createdAt: createdAt,
        ),
        now: updatedAt,
      );

      expect(profile.role, 'farmer');
      expect(profile.createdAt, createdAt);
      expect(profile.updatedAt, updatedAt);
    });

    test('normalizes non-farmer creation requests to citizen', () {
      final profile = UserProfileService.profileForCreation(
        UserProfile(uid: 'user-1', role: 'admin'),
        now: updatedAt,
      );

      expect(profile.role, 'citizen');
    });
  });

  test('serializes profile timestamps as Firestore timestamps', () {
    final map = UserProfile(
      uid: 'user-1',
      createdAt: createdAt,
      updatedAt: updatedAt,
    ).toMap();

    expect(map['createdAt'], Timestamp.fromDate(createdAt));
    expect(map['updatedAt'], Timestamp.fromDate(updatedAt));
  });
}
