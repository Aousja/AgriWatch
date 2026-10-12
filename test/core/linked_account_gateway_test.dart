import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:agriwatch/core/services/linked_account_gateway.dart';
import 'package:agriwatch/features/complaints/models/complaint.dart';
import 'package:agriwatch/features/complaints/repositories/supabase_complaint_repository.dart';
import 'package:firebase_auth/firebase_auth.dart';

class _TestUser implements User {
  _TestUser(this.uid);
  @override
  final String uid;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestAuth implements FirebaseAuth {
  _TestAuth(String uid) : currentUser = _TestUser(uid);
  @override
  final User currentUser;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('unconfigured linking makes no request and preserves native Firebase flow', () async {
    final gateway = LinkedAccountGateway(currentUid: () => 'mobile', token: () async => throw StateError('Must not request a token'), endpoint: '');
    expect(await gateway.account(), isNull);
  });
  test('foreign report ownership and stale sessions fail closed', () async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    var uid = 'mobile'; var foreign = true;
    server.listen((request) async {
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode({'status': 'linked', 'webUuid': 'web', 'firebaseUid': 'mobile', 'role': 'farmer', 'profile': {'uid': 'mobile'}, 'reports': [{'id': 'r', 'user_id': foreign ? 'someone-else' : 'web', 'firebase_uid': null}]}));
      if (!foreign) uid = 'different';
      await request.response.close();
    });
    final gateway = LinkedAccountGateway(currentUid: () => uid, token: () async => 'isolated-test-proof', endpoint: 'http://127.0.0.1:${server.port}/api/identity');
    try {
      await expectLater(gateway.account(), throwsStateError);
      foreign = false;
      await expectLater(gateway.account(), throwsStateError);
    } finally { await server.close(force: true); }
  });
  test('disposable linked account reads the same CMP ref and profile as the web client', () async {
    final endpoint = Platform.environment['AGRIWATCH_TEST_IDENTITY_URL'];
    expect(Uri.parse(endpoint!).host, '127.0.0.1');
    final uid = Platform.environment['AGRIWATCH_TEST_FIREBASE_UID']!;
    final proof = Platform.environment['AGRIWATCH_TEST_FIREBASE_TOKEN']!;
    final gateway = LinkedAccountGateway(currentUid: () => uid, token: () async => proof, endpoint: endpoint);
    final account = await gateway.account();
    expect(account!['profile']['name'], 'Disposable linked farmer');
    final reports = (account['reports'] as List).cast<Map<String, dynamic>>().map(Complaint.fromSupabase).toList();
    expect(reports.map((report) => report.ticketId), contains('CMP-LINK-LOCAL-001'));
    expect(reports.map((report) => report.ticketId), contains('CMP-LINK-WEB-002'));
    expect(reports.length, 2);
    final repository = SupabaseComplaintRepository(
      auth: _TestAuth(uid), linkedGatewayOverride: gateway,
    );
    expect((await repository.getComplaints()).map((report) => report.ticketId), contains('CMP-LINK-LOCAL-001'));
    expect((await repository.getComplaint(reports.first.id)).ticketId, reports.first.ticketId);
  }, skip: !Platform.environment.containsKey('AGRIWATCH_TEST_IDENTITY_URL'));
}
