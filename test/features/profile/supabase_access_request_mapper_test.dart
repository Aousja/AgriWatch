import 'package:flutter_test/flutter_test.dart';

import 'package:agriwatch/core/config/supabase_config.dart';
import 'package:agriwatch/features/profile/repositories/supabase_access_request_repository.dart';

void main() {
  test('maps the officer form to shared access-request columns', () {
    expect(
      SupabaseAccessRequestMapper.toInsert(
        uid: 'firebase-officer-1',
        requestedRole: 'officer',
        fullName: 'Amina Khan',
        organizationName: 'PDMA Punjab',
        designation: 'Field Officer',
        phone: '03001234567',
        reason: 'Need officer access',
        additionalFields: {
          'cnic': '35202-1234567-8',
          'province': 'Punjab',
          'district': 'Lahore',
          'department': 'Operations',
          'employeeId': 'PDMA-7',
          'officialEmail': 'amina@pdma.example',
        },
      ),
      {
        'firebase_uid': 'firebase-officer-1',
        'name': 'Amina Khan',
        'role': 'officer',
        'district': 'Lahore',
        'phone': '03001234567',
        'organization_name': 'PDMA Punjab',
        'designation': 'Field Officer',
        'reason': 'Need officer access',
        'cnic': '35202-1234567-8',
        'province': 'Punjab',
        'department': 'Operations',
        'employee_id': 'PDMA-7',
        'official_email': 'amina@pdma.example',
      },
    );
  });

  test('maps NGO operational district to the shared district column', () {
    final row = SupabaseAccessRequestMapper.toInsert(
      uid: 'firebase-ngo-1',
      requestedRole: 'ngo',
      fullName: 'Bilal Ahmed',
      organizationName: 'Green Fields',
      designation: 'Coordinator',
      phone: '03001112233',
      reason: 'Need NGO access',
      additionalFields: {
        'organizationType': 'NGO',
        'registrationNumber': 'NGO-22',
        'operationalProvince': 'Sindh',
        'operationalDistrict': 'Thatta',
        'officialEmail': 'bilal@green.example',
      },
    );

    expect(row['role'], 'ngo');
    expect(row['district'], 'Thatta');
    expect(row['operational_province'], 'Sindh');
    expect(row['operational_district'], 'Thatta');
    expect(row['organization_type'], 'NGO');
    expect(row['registration_number'], 'NGO-22');
  });

  test('rejects roles that mobile users must not submit', () {
    expect(
      () => SupabaseAccessRequestMapper.toInsert(
        uid: 'firebase-admin-1',
        requestedRole: 'admin',
        fullName: 'Admin',
        organizationName: 'AgriWatch',
        designation: 'Admin',
        phone: '03000000000',
        reason: 'Elevated access',
      ),
      throwsArgumentError,
    );
  });

  test('does not let the client choose status or submitted_at', () {
    final row = SupabaseAccessRequestMapper.toInsert(
      uid: 'firebase-user-1',
      requestedRole: 'ngo',
      fullName: 'User',
      organizationName: 'Org',
      designation: 'Coordinator',
      phone: '03000000000',
      reason: 'Reason',
      additionalFields: {
        'status': 'approved',
        'submittedAt': '2026-10-04T00:00:00Z',
        'organizationType': 'NGO',
        'registrationNumber': 'NGO-1',
        'operationalProvince': 'Punjab',
        'operationalDistrict': 'Lahore',
        'officialEmail': 'user@example.com',
      },
    );

    expect(row, isNot(containsPair('status', anything)));
    expect(row, isNot(containsPair('submitted_at', anything)));
  });

  test('keeps the Supabase access-request path disabled by default', () {
    expect(SupabaseConfig.useSupabaseAccessRequests, isFalse);
  });
}
