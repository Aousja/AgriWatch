import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:agriwatch/features/profile/services/access_request_service.dart';

void main() {
  test('latest own request preserves status and excludes another UID', () {
    final older = {'uid': 'owner', 'status': 'pending', 'submittedAt': Timestamp(1, 0)};
    final latest = {'uid': 'owner', 'status': 'rejected', 'submittedAt': Timestamp(2, 0)};
    final other = {'uid': 'other', 'status': 'approved', 'submittedAt': Timestamp(3, 0)};
    expect(AccessRequestService.latestOwnRequest('owner', [other, older, latest]), same(latest));
    expect(older['status'], 'pending');
    expect(latest['status'], 'rejected');
  });
  test('no existing request returns null without inventing a status', () {
    expect(AccessRequestService.latestOwnRequest('owner', []), isNull);
    expect(AccessRequestService.latestOwnRequest('owner', [{'uid': 'other'}]), isNull);
  });
}
