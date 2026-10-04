import 'package:flutter_test/flutter_test.dart';

import 'package:agriwatch/features/profile/models/user_profile.dart';
import 'package:agriwatch/features/profile/repositories/supabase_profile_repository.dart';

void main() {
  test('maps a farmer profile to the Firebase-UID Supabase shape', () {
    final profile = UserProfile(
      uid: 'firebase-user-1',
      name: 'Amina Khan',
      phoneNumber: '+923001234567',
      email: 'amina@example.com',
      photoUrl: 'https://example.com/amina.jpg',
      role: 'farmer',
      district: 'Lahore',
    );

    expect(SupabaseProfileMapper.toInsert(profile), {
      'firebase_uid': 'firebase-user-1',
      'name': 'Amina Khan',
      'phone_number': '+923001234567',
      'email': 'amina@example.com',
      'photo_url': 'https://example.com/amina.jpg',
      'role': 'farmer',
      'district': 'Lahore',
    });
  });

  test('normalizes elevated roles before a client insert', () {
    final profile = UserProfile(uid: 'firebase-user-2', role: 'admin');

    expect(SupabaseProfileMapper.toInsert(profile)['role'], 'citizen');
    expect(
      SupabaseProfileMapper.toInsert(
        UserProfile(uid: 'firebase-user-3', role: 'pdma_officer'),
      )['role'],
      'citizen',
    );
  });

  test('maps only permitted profile fields for updates', () {
    expect(
      SupabaseProfileMapper.toUpdate({
        'name': 'Updated name',
        'phoneNumber': '+923111111111',
        'email': 'updated@example.com',
        'photoUrl': null,
        'district': 'Multan',
        'uid': 'another-user',
        'role': 'admin',
        'createdAt': DateTime(2026, 10, 4),
        'updatedAt': DateTime(2026, 10, 4),
      }),
      {
        'name': 'Updated name',
        'phone_number': '+923111111111',
        'email': 'updated@example.com',
        'photo_url': null,
        'district': 'Multan',
      },
    );
  });

  test('preserves an elevated role when reading a server-managed row', () {
    final profile = SupabaseProfileMapper.fromRow({
      'firebase_uid': 'firebase-admin-1',
      'name': 'PDMA Officer',
      'phone_number': null,
      'email': 'officer@example.com',
      'photo_url': null,
      'role': 'pdma_officer',
      'district': 'Peshawar',
      'created_at': '2026-10-04T10:00:00.000Z',
      'updated_at': '2026-10-04T10:05:00.000Z',
    });

    expect(profile.uid, 'firebase-admin-1');
    expect(profile.role, 'pdma_officer');
    expect(profile.createdAt, DateTime.parse('2026-10-04T10:00:00.000Z'));
    expect(profile.updatedAt, DateTime.parse('2026-10-04T10:05:00.000Z'));
  });
}
