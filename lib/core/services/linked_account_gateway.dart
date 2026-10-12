import 'dart:convert';
import 'dart:io';

/// Optional, server-verified read view. Authentication stays Firebase on mobile.
/// No account creation, linking, profile/report writes or approval changes here.
class LinkedAccountGateway {
  LinkedAccountGateway({
    required this.currentUid,
    required this.token,
    this.endpoint = const String.fromEnvironment('IDENTITY_LINK_API_URL'),
  });

  final String? Function() currentUid;
  final Future<String?> Function() token;
  final String endpoint;

  Future<Map<String, dynamic>?> account() async {
    if (endpoint.isEmpty) return null;
    final uri = Uri.parse(endpoint);
    if (uri.scheme != 'https' &&
        !(uri.scheme == 'http' && {'127.0.0.1', 'localhost'}.contains(uri.host))) {
      throw StateError('Account linking requires a secure server endpoint.');
    }
    final uid = currentUid();
    final credential = await token();
    if (uid == null || credential == null || currentUid() != uid) {
      throw StateError('Sign in to read your linked account.');
    }
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 20);
    try {
      final request = await client.getUrl(uri.replace(queryParameters: {
        ...uri.queryParameters,
        'client': 'mobile',
      })).timeout(const Duration(seconds: 20));
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $credential');
      final response = await request.close().timeout(const Duration(seconds: 20));
      final body = await utf8.decoder.bind(response).join().timeout(const Duration(seconds: 20));
      if (response.statusCode != 200) {
        // Never display the raw server body or credentials.
        throw StateError('Linked account could not be read. Retry account linking on the website.');
      }
      final result = jsonDecode(body) as Map<String, dynamic>;
      if (currentUid() != uid) throw StateError('The signed-in account changed.');
      if (result['status'] == 'unlinked') return null;
      if (result['status'] != 'linked' || result['firebaseUid'] != uid ||
          (result['profile'] as Map?)?['uid'] != uid ||
          !{'farmer', 'public'}.contains(result['role'])) {
        throw StateError('Linked account ownership could not be verified.');
      }
      final webId = result['webUuid'];
      if (webId is! String || webId.isEmpty) throw StateError('Linked account ownership could not be verified.');
      for (final row in (result['reports'] as List).cast<Map>()) {
        if ((row['user_id'] == null && row['firebase_uid'] == null) ||
            (row['firebase_uid'] != null && row['firebase_uid'] != uid) ||
            (row['user_id'] != null && row['user_id'] != webId)) {
          throw StateError('Linked report ownership could not be verified.');
        }
      }
      return result;
    } finally { client.close(force: true); }
  }
}
