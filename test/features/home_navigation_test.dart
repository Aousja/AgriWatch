import 'dart:async';

import 'package:agriwatch/core/design/app_design.dart';
import 'package:agriwatch/core/services/local_storage_service.dart';
import 'package:agriwatch/features/home/home_screen.dart';
import 'package:agriwatch/features/profile/models/user_profile.dart';
import 'package:agriwatch/features/shell/app_shell.dart';
import 'package:agriwatch/features/shell/shell_profile_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

const citizen = UserProfile(
  uid: 'current-account',
  name: 'Citizen',
  role: 'citizen',
);

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({'language': 'en'});
    await LocalStorageService.init();
  });

  testWidgets(
    'tabs and focus changes do not refetch; background reads coalesce',
    (tester) async {
      final requests = <Completer<UserProfile?>>[];
      final forced = <bool>[];
      await tester.pumpWidget(
        MaterialApp(
          home: AppShell(
            profileLoader: (refresh) {
              forced.add(refresh);
              final request = Completer<UserProfile?>();
              requests.add(request);
              return request.future;
            },
          ),
        ),
      );
      expect(requests.length, 1);
      await tester.tap(find.text('Alerts'));
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(requests.length, 1);
      requests.first.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(requests.length, 2);
      expect(forced, [false, true]);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(requests.length, 2);
      requests.last.completeError(StateError('offline'));
      await tester.pumpAndSettle();
    },
  );

  test(
    'greetings use local morning, afternoon, evening and overnight hours',
    () async {
      for (final entry in {
        4: 'Hello',
        5: 'Good morning',
        11: 'Good morning',
        12: 'Good afternoon',
        16: 'Good afternoon',
        17: 'Good evening',
        20: 'Good evening',
        21: 'Hello',
      }.entries) {
        expect(
          HomeScreen.greetingFor(DateTime(2026, 10, 12, entry.key)),
          entry.value,
        );
      }
      await LocalStorageService.setLanguage('ur');
      expect(HomeScreen.greetingFor(DateTime(2026, 10, 12, 8)), 'صبح بخیر');
      expect(HomeScreen.greetingFor(DateTime(2026, 10, 12, 14)), 'سہ پہر بخیر');
      expect(HomeScreen.greetingFor(DateTime(2026, 10, 12, 18)), 'شام بخیر');
      expect(
        HomeScreen.greetingFor(DateTime(2026, 10, 12, 23)),
        'السلام علیکم',
      );
    },
  );

  testWidgets(
    'Citizen Home has exactly two actions and a passive monitoring notice',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppDesign.theme(),
          home: const Scaffold(body: HomeScreen(profile: citizen)),
        ),
      );
      expect(find.byType(ActionTile), findsNWidgets(2));
      expect(find.text('Farming Advisory'), findsOneWidget);
      expect(find.text('Report Drought Situation'), findsOneWidget);
      expect(find.text('View alerts'), findsNothing);
      expect(find.byType(CircleAvatar), findsNothing);
      final notice = find.text(
        'Local monitoring unavailable. Live data is not connected yet.',
      );
      expect(notice, findsOneWidget);
      expect(
        find.ancestor(of: notice, matching: find.byType(InkWell)),
        findsNothing,
      );
    },
  );

  testWidgets(
    'initial loading only; refresh and route Back preserve mounted content and input',
    (tester) async {
      final initial = Completer<UserProfile?>();
      Future<UserProfile?> read = initial.future;
      late StateSetter change;
      await tester.pumpWidget(
        MaterialApp(
          home: StatefulBuilder(
            builder: (context, setState) {
              change = setState;
              return Scaffold(
                body: ShellProfileView(
                  future: read,
                  onRetry: () {},
                  builder: (_) => Column(
                    children: [
                      const TextField(key: ValueKey('retained-input')),
                      TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                const Scaffold(body: Text('Report route')),
                          ),
                        ),
                        child: const Text('Open report'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      initial.complete(citizen);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('retained-input')),
        'Existing draft',
      );
      final state = tester.state(find.byType(TextField));
      final refresh = Completer<UserProfile?>();
      change(() {
        read = refresh.future;
      });
      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('Existing draft'), findsOneWidget);
      await tester.tap(find.text('Open report'));
      await tester.pumpAndSettle();
      refresh.complete(citizen);
      await tester.pumpAndSettle();
      tester.state<NavigatorState>(find.byType(Navigator)).pop();
      await tester.pumpAndSettle();
      expect(tester.state(find.byType(TextField)), same(state));
      expect(find.text('Existing draft'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    },
  );

  testWidgets(
    'failed refresh blocks actions and retry does not expose stale access',
    (tester) async {
      Future<UserProfile?> read = Future.value(citizen);
      late StateSetter change;
      await tester.pumpWidget(
        MaterialApp(
          home: StatefulBuilder(
            builder: (_, setState) {
              change = setState;
              return Scaffold(
                body: ShellProfileView(
                  future: read,
                  onRetry: () {},
                  builder: (_) => const Text('Account actions'),
                ),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      final failure = Completer<UserProfile?>();
      change(() {
        read = failure.future;
      });
      await tester.pump();
      expect(find.text('Account actions'), findsOneWidget);
      failure.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      expect(find.text('Account actions'), findsNothing);
      expect(find.text('Retry'), findsOneWidget);
      final retry = Completer<UserProfile?>();
      change(() {
        read = retry.future;
      });
      await tester.pump();
      expect(find.text('Account actions'), findsNothing);
      retry.complete(citizen);
      await tester.pumpAndSettle();
      expect(find.text('Account actions'), findsOneWidget);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ShellProfileView(
              key: const ValueKey('different-account'),
              future: Completer<UserProfile?>().future,
              onRetry: () {},
              builder: (_) => const Text('Account actions'),
            ),
          ),
        ),
      );
      expect(find.text('Account actions'), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    },
  );
}
