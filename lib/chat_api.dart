import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class ChatFailure implements Exception {
  const ChatFailure(this.message, {this.retryable = false});
  final String message;
  final bool retryable;
  @override
  String toString() => message;
}

class ChatAttachment {
  const ChatAttachment(this.name, this.bytes, this.mimeType);
  final String name;
  final Uint8List bytes;
  final String mimeType;
  bool get isImage => mimeType.startsWith('image/');
}

/// Uses Firebase accounts and the same advisory API as the web client.
/// Firebase's public web API key is client configuration; Gemini keys stay server-side.
class ChatApi {
  ChatApi({
    http.Client? client,
    this.idTokenProvider,
    this.baseUrl = const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://farmer-advisory-api-ashy.vercel.app',
    ),
    this.firebaseKey = const String.fromEnvironment('FIREBASE_API_KEY'),
  }) : _client = client ?? http.Client();

  final http.Client _client;

  /// Supply the signed-in app user's Firebase ID token when embedding chat.
  /// Pass `true` to refresh the token after an authentication failure.
  final Future<String> Function(bool forceRefresh)? idTokenProvider;
  final String baseUrl;
  final String firebaseKey;
  String? _idToken;
  String? _refreshToken;
  DateTime _expires = DateTime(1970);
  bool get signedIn => idTokenProvider != null || _refreshToken != null;
  bool get configured => idTokenProvider != null || firebaseKey.isNotEmpty;

  Future<void> signIn(String email, String password) async {
    if (!configured) {
      throw const ChatFailure(
        'Firebase login has not been configured for this build. See the Flutter README.',
      );
    }
    try {
      final response = await _client
          .post(
            Uri.https(
              'identitytoolkit.googleapis.com',
              '/v1/accounts:signInWithPassword',
              {'key': firebaseKey},
            ),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
              'returnSecureToken': true,
            }),
          )
          .timeout(const Duration(seconds: 20));
      if (response.statusCode != 200) {
        throw const ChatFailure(
          'Could not sign in. Check your account and Firebase configuration.',
        );
      }
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      _idToken = data['idToken'] as String;
      _refreshToken = data['refreshToken'] as String;
      _expires = DateTime.now().add(
        Duration(seconds: int.parse(data['expiresIn'].toString()) - 60),
      );
    } on ChatFailure {
      rethrow;
    } catch (_) {
      throw const ChatFailure(
        'Could not reach Firebase. Check your connection and try again.',
      );
    }
  }

  Future<String> _token({bool force = false}) async {
    if (idTokenProvider != null) {
      try {
        final token = await idTokenProvider!(force);
        if (token.isEmpty) {
          throw const ChatFailure('Sign in to send a question.');
        }
        return token;
      } on ChatFailure {
        rethrow;
      } catch (_) {
        throw const ChatFailure('Sign in to send a question.');
      }
    }
    if (!signedIn) throw const ChatFailure('Sign in to send a question.');
    if (!force && DateTime.now().isBefore(_expires)) return _idToken!;
    final response = await _client
        .post(
          Uri.https('securetoken.googleapis.com', '/v1/token', {
            'key': firebaseKey,
          }),
          body: {
            'grant_type': 'refresh_token',
            'refresh_token': _refreshToken!,
          },
        )
        .timeout(const Duration(seconds: 20));
    if (response.statusCode != 200) {
      signOut();
      throw const ChatFailure('Your session expired. Sign in again.');
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    _idToken = data['id_token'] as String;
    _refreshToken = data['refresh_token'] as String;
    _expires = DateTime.now().add(
      Duration(seconds: int.parse(data['expires_in'].toString()) - 60),
    );
    return _idToken!;
  }

  Uri _uri(String path) => Uri.parse(
    '${baseUrl.replaceFirst(RegExp(r'/+$'), '')}/api/advisory$path',
  );

  Map<String, dynamic> _decode(http.Response response) {
    final data = response.bodyBytes.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      final error = data['error'] as Map<String, dynamic>?;
      throw ChatFailure(
        error?['message'] as String? ?? 'The request could not be completed.',
        retryable: [
          'request_pending',
          'conversation_busy',
        ].contains(error?['code']),
      );
    }
    return data;
  }

  Future<Map<String, dynamic>> get(String path) async {
    try {
      for (var attempt = 0; attempt < 2; attempt++) {
        final token = await _token(force: attempt > 0);
        final response = await _client
            .get(_uri(path), headers: {'Authorization': 'Bearer $token'})
            .timeout(const Duration(seconds: 20));
        if (response.statusCode == 401 && attempt == 0) continue;
        if (response.statusCode == 401) signOut();
        return _decode(response);
      }
      throw const ChatFailure('Sign in again.');
    } on ChatFailure {
      rethrow;
    } catch (_) {
      throw const ChatFailure(
        'Could not load chat history. Check your connection and try again.',
      );
    }
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      for (var attempt = 0; attempt < 2; attempt++) {
        final token = await _token(force: attempt > 0);
        final response = await _client
            .post(
              _uri(path),
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
              body: jsonEncode(body),
            )
            .timeout(const Duration(seconds: 110));
        if (response.statusCode == 401 && attempt == 0) continue;
        if (response.statusCode == 401) signOut();
        return _decode(response);
      }
      throw const ChatFailure('Sign in again.');
    } on ChatFailure {
      rethrow;
    } catch (_) {
      throw const ChatFailure(
        'Could not reach the chat service. Check the connection, then retry the same question.',
        retryable: true,
      );
    }
  }

  Future<String> upload(String conversation, ChatAttachment attachment) async {
    try {
      for (var attempt = 0; attempt < 2; attempt++) {
        final request = http.MultipartRequest('POST', _uri('/attachments'))
          ..headers['Authorization'] =
              'Bearer ${await _token(force: attempt > 0)}'
          ..fields['conversation_id'] = conversation
          ..files.add(
            http.MultipartFile.fromBytes(
              'file',
              attachment.bytes,
              filename: attachment.name,
              contentType: MediaType.parse(attachment.mimeType),
            ),
          );
        final response = await (() async => http.Response.fromStream(
          await _client.send(request),
        ))().timeout(const Duration(seconds: 45));
        if (response.statusCode == 401 && attempt == 0) continue;
        if (response.statusCode == 401) signOut();
        return _decode(response)['attachment_id'] as String;
      }
      throw const ChatFailure('Sign in again.');
    } on ChatFailure {
      rethrow;
    } catch (_) {
      throw const ChatFailure(
        'Upload failed. Check the connection and try again.',
      );
    }
  }

  void signOut() {
    _idToken = null;
    _refreshToken = null;
    _expires = DateTime(1970);
  }

  void dispose() {
    signOut();
    _client.close();
  }
}
