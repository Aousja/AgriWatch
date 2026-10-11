import 'dart:convert';

import 'package:agriwatch/chat/chat_api.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('uses the existing Firebase token and the advisory API URL', () async {
    late http.Request sent;
    final api = ChatApi(
      baseUrl: 'https://farmer-advisory-api-ashy.vercel.app',
      idTokenProvider: (refresh) async => 'app-token',
      client: MockClient((request) async {
        sent = request;
        return http.Response('{"conversation_id":"test-id"}', 201);
      }),
    );

    final result = await api.post('/conversations', {'language': 'ur'});

    expect(
      sent.url.toString(),
      'https://farmer-advisory-api-ashy.vercel.app/api/advisory/conversations',
    );
    expect(sent.headers['Authorization'], 'Bearer app-token');
    expect(jsonDecode(sent.body), {'language': 'ur'});
    expect(result['conversation_id'], 'test-id');
    api.dispose();
  });

  test('refreshes the app token once after an unauthorized response', () async {
    final refreshCalls = <bool>[];
    final api = ChatApi(
      idTokenProvider: (refresh) async {
        refreshCalls.add(refresh);
        return refresh ? 'fresh-token' : 'old-token';
      },
      client: MockClient((request) async {
        if (request.headers['Authorization'] == 'Bearer old-token') {
          return http.Response('{"error":{"message":"Expired"}}', 401);
        }
        return http.Response('{"conversations":[]}', 200);
      }),
    );

    expect((await api.get('/conversations'))['conversations'], isEmpty);
    expect(refreshCalls, [false, true]);
    api.dispose();
  });
}
