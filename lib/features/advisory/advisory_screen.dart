import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../chat/chat_api.dart';
import '../../core/design/app_design.dart';

class AdvisoryScreen extends StatefulWidget {
  const AdvisoryScreen({super.key});

  @override
  State<AdvisoryScreen> createState() => _AdvisoryScreenState();
}

class _AdvisoryScreenState extends State<AdvisoryScreen> {
  late final ChatApi _api = ChatApi(
    idTokenProvider: (refresh) async =>
        await FirebaseAuth.instance.currentUser?.getIdToken(refresh) ?? '',
  );
  final _input = TextEditingController();
  final _recorder = AudioRecorder();
  final _picker = ImagePicker();
  final _scroll = ScrollController();
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _messages = [];
  String? _conversationId;
  String? _requestId;
  ChatAttachment? _attachment;
  String _language = 'ur';
  String? _error;
  bool _busy = false;
  bool _loading = true;
  bool _recording = false;
  Timer? _recordTimer;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    if (_recording) _recorder.cancel();
    _recorder.dispose();
    _api.dispose();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _items(dynamic value, String key) {
    final list = value is List
        ? value
        : value is Map
        ? value[key] ?? value['items'] ?? value['data']
        : null;
    return list is List
        ? list
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList()
        : [];
  }

  String? _identifier(Map<String, dynamic> value) =>
      (value['conversation_id'] ?? value['id'])?.toString();

  String _uuid() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  Future<void> _loadConversations() async {
    try {
      final result = await _api.get('/conversations');
      if (!mounted) return;
      setState(() {
        _conversations = _items(result, 'conversations');
        _error = null;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _openConversation(String id) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _api.get('/conversations/$id/messages');
      if (!mounted) return;
      setState(() {
        _conversationId = id;
        _messages = _items(result, 'messages');
        _loading = false;
      });
      _scrollToEnd();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  void _newConversation() {
    setState(() {
      _conversationId = null;
      _messages = [];
      _attachment = null;
      _requestId = null;
      _error = null;
      _input.clear();
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final photo = await _picker.pickImage(source: source, imageQuality: 75);
      if (photo == null) return;
      final bytes = await photo.readAsBytes();
      if (bytes.length > 4 * 1024 * 1024) {
        throw const ChatFailure('The photo must be smaller than 4 MiB.');
      }
      if (!mounted) return;
      setState(() {
        _attachment = ChatAttachment(
          photo.name,
          bytes,
          photo.mimeType ?? 'image/jpeg',
        );
        _requestId = null;
        _error = null;
      });
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      _recordTimer?.cancel();
      try {
        final path = await _recorder.stop();
        if (path == null) throw const ChatFailure('Recording was not saved.');
        final bytes = await File(path).readAsBytes();
        if (bytes.length > 4 * 1024 * 1024) {
          throw const ChatFailure('The recording must be smaller than 4 MiB.');
        }
        if (!mounted) return;
        setState(() {
          _attachment = ChatAttachment('question.wav', bytes, 'audio/wav');
          _recording = false;
          _requestId = null;
          _error = null;
        });
      } catch (error) {
        if (mounted) {
          setState(() {
            _recording = false;
            _error = error.toString();
          });
        }
      }
      return;
    }
    try {
      if (!await _recorder.hasPermission()) {
        throw const ChatFailure(
          'Microphone permission is needed to record a question.',
        );
      }
      final directory = await getTemporaryDirectory();
      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          numChannels: 1,
        ),
        path:
            '${directory.path}/advisory_${DateTime.now().millisecondsSinceEpoch}.wav',
      );
      if (!mounted) return;
      setState(() {
        _recording = true;
        _error = null;
      });
      _recordTimer = Timer(const Duration(seconds: 59), () {
        if (mounted && _recording) _toggleRecording();
      });
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _send() async {
    final message = _input.text.trim();
    if (_busy || _recording || (message.isEmpty && _attachment == null)) return;
    setState(() {
      _busy = true;
      _error = null;
      _requestId ??= _uuid();
    });
    try {
      var id = _conversationId;
      if (id == null) {
        final created = await _api.post('/conversations', {
          'language': _language,
        });
        id = _identifier(created);
        if (id == null) {
          throw const ChatFailure('The service did not create a conversation.');
        }
        if (mounted) setState(() => _conversationId = id);
      }
      final attachmentIds = <String>[];
      if (_attachment != null) {
        attachmentIds.add(await _api.upload(id, _attachment!));
      }
      final result = await _api.post('/chat', {
        'conversation_id': id,
        'client_request_id': _requestId,
        'message': message,
        'language': _language,
        'attachment_ids': attachmentIds,
      });
      if (!mounted) return;
      _input.clear();
      setState(() {
        _attachment = null;
        _requestId = null;
        _messages.add({'role': 'user', 'content': message});
        _messages.add({
          'role': 'assistant',
          'content':
              result['answer'] ?? result['response'] ?? result['message'] ?? '',
          'sources': result['sources'],
        });
      });
      _scrollToEnd();
      await _openConversation(id);
      await _loadConversations();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _content(Map<String, dynamic> message) {
    final value =
        message['content'] ??
        message['text'] ??
        message['answer'] ??
        message['message'];
    return value is String ? value : value?.toString() ?? '';
  }

  Widget _message(Map<String, dynamic> message) {
    final isUser = message['role'] == 'user';
    final sources = _items(message['sources'], 'sources');
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 340),
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isUser ? AppDesign.green : Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_content(message).isNotEmpty)
              SelectableText(
                _content(message),
                style: TextStyle(
                  color: isUser ? Colors.white : AppDesign.ink,
                  height: 1.45,
                ),
              ),
            for (final source in sources)
              if (Uri.tryParse('${source['url'] ?? ''}')?.hasScheme == true)
                TextButton(
                  onPressed: () =>
                      launchUrl(Uri.parse(source['url'].toString())),
                  child: Text(source['title']?.toString() ?? 'Source'),
                ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Farming Advisory'),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Answer language',
            initialValue: _language,
            onSelected: (value) => setState(() => _language = value),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'ur', child: Text('Urdu')),
              PopupMenuItem(value: 'en', child: Text('English')),
              PopupMenuItem(value: 'ur-Latn', child: Text('Roman Urdu')),
            ],
            icon: const Icon(Icons.language),
          ),
          IconButton(
            tooltip: 'New conversation',
            onPressed: _newConversation,
            icon: const Icon(Icons.add_comment_outlined),
          ),
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            children: [
              ListTile(
                title: const Text('Conversations'),
                trailing: IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loadConversations,
                ),
              ),
              ListTile(
                leading: const Icon(Icons.add),
                title: const Text('New conversation'),
                onTap: () {
                  Navigator.pop(context);
                  _newConversation();
                },
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _conversations.length,
                  itemBuilder: (context, index) {
                    final conversation = _conversations[index];
                    final id = _identifier(conversation);
                    return ListTile(
                      leading: const Icon(Icons.chat_bubble_outline),
                      title: Text(
                        conversation['title']?.toString() ??
                            'Conversation ${index + 1}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      selected: id == _conversationId,
                      onTap: id == null
                          ? null
                          : () {
                              Navigator.pop(context);
                              _openConversation(id);
                            },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (_error != null)
              MaterialBanner(
                content: Text(_error!),
                actions: [
                  TextButton(
                    onPressed: () => setState(() => _error = null),
                    child: const Text('Dismiss'),
                  ),
                ],
              ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(28),
                        child: Text(
                          'Ask about crops, soil, irrigation, pests, or drought. You can add a photo or a short voice recording.',
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) =>
                          _message(_messages[index]),
                    ),
            ),
            if (_attachment != null)
              ListTile(
                leading: _attachment!.isImage
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.memory(
                          _attachment!.bytes,
                          width: 44,
                          height: 44,
                          fit: BoxFit.cover,
                        ),
                      )
                    : const Icon(Icons.mic),
                title: Text(_attachment!.name),
                trailing: IconButton(
                  tooltip: 'Remove attachment',
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() {
                    _attachment = null;
                    _requestId = null;
                  }),
                ),
              ),
            if (_recording) const Text('Recording… tap the microphone to stop'),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 10),
              child: Row(
                children: [
                  PopupMenuButton<ImageSource>(
                    tooltip: 'Attach photo',
                    icon: const Icon(Icons.add_photo_alternate_outlined),
                    onSelected: _pickImage,
                    itemBuilder: (_) => const [
                      PopupMenuItem(
                        value: ImageSource.camera,
                        child: Text('Camera'),
                      ),
                      PopupMenuItem(
                        value: ImageSource.gallery,
                        child: Text('Gallery'),
                      ),
                    ],
                  ),
                  IconButton(
                    tooltip: _recording ? 'Stop recording' : 'Record question',
                    onPressed: _busy ? null : _toggleRecording,
                    icon: Icon(_recording ? Icons.stop_circle : Icons.mic_none),
                    color: _recording ? Colors.red : null,
                  ),
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 4000,
                      onChanged: (_) => _requestId = null,
                      decoration: const InputDecoration(
                        hintText: 'Ask a farming question',
                        counterText: '',
                      ),
                    ),
                  ),
                  IconButton.filled(
                    tooltip: 'Send question',
                    onPressed: _busy || _recording ? null : _send,
                    icon: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
