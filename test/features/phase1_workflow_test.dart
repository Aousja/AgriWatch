import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:agriwatch/core/design/app_design.dart';
import 'package:agriwatch/core/design/workflow_copy.dart';
import 'package:agriwatch/core/services/local_storage_service.dart';
import 'package:agriwatch/features/alerts/alerts_screen.dart';
import 'package:agriwatch/features/profile/models/user_profile.dart';
import 'package:agriwatch/features/profile/widgets/profile_read_view.dart';
import 'package:agriwatch/features/profile/screens/profile_edit_screen.dart';
import 'package:agriwatch/features/complaints/models/complaint.dart';
import 'package:agriwatch/features/complaints/models/report_categories.dart';
import 'package:agriwatch/features/complaints/repositories/complaint_repository.dart';
import 'package:agriwatch/features/complaints/services/complaint_service.dart';
import 'package:agriwatch/features/complaints/screens/complaints_screen.dart';
import 'package:agriwatch/features/complaints/screens/submit_complaint_screen.dart';
import 'package:agriwatch/features/complaints/widgets/complaint_card.dart';
import 'package:agriwatch/features/complaints/screens/complaint_detail_screen.dart';
import 'package:agriwatch/features/language/language_screen.dart';

const profile = UserProfile(
  uid: 'existing-user',
  name: 'Farmer',
  district: 'Tharparkar',
  phoneNumber: '+923001234567',
  email: 'farmer@example.test',
  role: 'farmer',
);

Complaint report(String id, {bool resolved = false}) => Complaint.fromSupabase({
  'id': id,
  'ref': 'CMP-$id',
  'firebase_uid': profile.uid,
  'category': droughtReportCategories.first,
  'description': 'Stored report text',
  'district': 'Tharparkar',
  'status': resolved ? 'Resolved' : 'Submitted',
  'created_at': '2026-10-08T10:00:00Z',
  if (resolved) 'resolved_at': '2026-10-09T10:00:00Z',
});

class Reports extends ComplaintRepository {
  List<Complaint> rows = [
    report('EXISTING'),
    report('RESOLVED', resolved: true),
  ];
  bool readError = false, detailError = false;
  int reads = 0, details = 0, submits = 0;
  Completer<Complaint>? pending;
  String? description, category, crop;
  @override
  Future<List<Complaint>> getComplaints() async {
    reads++;
    if (readError) throw StateError('offline');
    return rows;
  }

  @override
  Future<Complaint> getComplaint(String id) async {
    details++;
    if (detailError) throw StateError('offline');
    return rows.firstWhere((row) => row.id == id);
  }

  @override
  Future<Complaint> submitComplaint({
    required String category,
    required String cropType,
    required String description,
    String? evidencePath,
  }) {
    submits++;
    this.description = description;
    this.category = category;
    crop = cropType;
    return pending!.future;
  }
}

Widget app(Widget home) => MaterialApp(
  theme: AppDesign.theme(),
  locale: Locale(LocalStorageService.getLanguage()),
  supportedLocales: const [Locale('en'), Locale('ur')],
  localizationsDelegates: GlobalMaterialLocalizations.delegates,
  home: home,
);

Future<void> tapVisible(
  WidgetTester tester,
  Finder finder, {
  bool up = false,
}) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      up ? -200 : 200,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pump();
}

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({'language': 'en'});
    await LocalStorageService.init();
  });

  testWidgets(
    'profile refresh failure hides stale data and preserves mounted tab input on retry',
    (tester) async {
      Future<UserProfile?> read = Future.value(profile);
      late StateSetter change;
      await tester.pumpWidget(
        app(
          StatefulBuilder(
            builder: (context, setState) {
              change = setState;
              return ProfileReadView(
                future: read,
                onRetry: () => setState(() {
                  read = Future.value(profile);
                }),
                builder: (_) =>
                    const Scaffold(body: TextField(key: ValueKey('tab-draft'))),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('tab-draft')),
        'Keep my search',
      );
      final pending = Completer<UserProfile?>();
      change(() {
        read = pending.future;
      });
      await tester.pump();
      expect(find.byKey(const ValueKey('tab-draft')), findsNothing);
      pending.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      expect(find.text('Retry'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(find.text('Keep my search'), findsOneWidget);
    },
  );

  testWidgets('changing language from account returns to the existing route', (
    tester,
  ) async {
    await tester.pumpWidget(
      ValueListenableBuilder<String>(
        valueListenable: LocalStorageService.language,
        builder: (_, language, child) => app(
          Builder(
            builder: (context) => Scaffold(
              body: Column(
                children: [
                  const Text('account-open'),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            const LanguageScreen(returnToPrevious: true),
                      ),
                    ),
                    child: const Text('language'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('language'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.text('اردو'));
    await tapVisible(tester, find.text('Continue  |  جاری رکھیں'));
    await tester.pumpAndSettle();
    expect(LocalStorageService.getLanguage(), 'ur');
    expect(find.text('account-open'), findsOneWidget);
    final context = tester.element(find.text('account-open'));
    expect(Localizations.localeOf(context).languageCode, 'ur');
    expect(Directionality.of(context), TextDirection.rtl);
  });

  testWidgets(
    'report details error retries without inventing status or support',
    (tester) async {
      final repository = Reports()..detailError = true;
      await tester.pumpWidget(
        app(
          ComplaintDetailScreen(
            complaintId: 'EXISTING',
            profile: profile,
            service: ComplaintService(repository: repository),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Could not load report'), findsOneWidget);
      expect(find.text('CMP-EXISTING'), findsNothing);
      repository.detailError = false;
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(find.text('CMP-EXISTING'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Support is not available in this app.'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      final support = find.widgetWithText(
        FilledButton,
        'Support is not available in this app.',
      );
      expect(tester.widget<FilledButton>(support).onPressed, isNull);
    },
  );

  testWidgets(
    'profile read errors and missing shell profile offer retry, never success',
    (tester) async {
      var attempts = 0, successes = 0;
      final first = Completer<UserProfile?>();
      await tester.pumpWidget(
        app(
          StatefulBuilder(
            builder: (context, setState) => ProfileReadView(
              future: attempts == 0 ? first.future : Future.value(profile),
              onRetry: () => setState(() => attempts++),
              builder: (value) {
                successes++;
                return Text(value.name!);
              },
            ),
          ),
        ),
      );
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      first.completeError(StateError('permission denied'));
      await tester.pumpAndSettle();
      expect(find.text('Retry'), findsOneWidget);
      expect(successes, 0);
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(find.text('Farmer'), findsOneWidget);
      expect(successes, greaterThan(0));
      await tester.pumpWidget(
        app(
          ProfileReadView(
            future: Future.value(null),
            onRetry: () {},
            builder: (_) => const Text('must not show'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('must not show'), findsNothing);
      expect(find.text('Retry'), findsOneWidget);
    },
  );

  testWidgets(
    'profile edit failure keeps values; retry returns same identity and role',
    (tester) async {
      UserProfile? result;
      Map<String, dynamic>? saved;
      var saves = 0;
      await tester.pumpWidget(
        app(
          Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () async {
                  result = await Navigator.push<UserProfile>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProfileEditScreen(
                        profile: profile,
                        saveProfile: (uid, data) async {
                          expect(uid, profile.uid);
                          saved = data;
                          saves++;
                          if (saves == 1) throw StateError('offline');
                        },
                      ),
                    ),
                  );
                },
                child: const Text('edit'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('edit'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('profile-name')),
        'Updated name',
      );
      await tapVisible(tester, find.byKey(const ValueKey('save-profile')));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Unable to save profile. Your entries are kept. Please retry.',
        ),
        findsOneWidget,
      );
      expect(find.text('Updated name'), findsOneWidget);
      await tapVisible(tester, find.byKey(const ValueKey('save-profile')));
      await tester.pumpAndSettle();
      expect(saved, {'name': 'Updated name'});
      expect(result!.uid, profile.uid);
      expect(result!.role, profile.role);
      expect(result!.phoneNumber, profile.phoneNumber);
      expect(saves, 2);
    },
  );

  testWidgets('district editor round trip preserves report text and category', (
    tester,
  ) async {
    final repository = Reports();
    final service = ComplaintService(repository: repository);
    const noDistrict = UserProfile(
      uid: 'existing-user',
      name: 'Farmer',
      role: 'farmer',
    );
    Map<String, dynamic>? changes;
    await tester.pumpWidget(
      app(
        Builder(
          builder: (context) => SubmitComplaintScreen(
            profile: noDistrict,
            service: service,
            editProfile: (original) => Navigator.push<UserProfile>(
              context,
              MaterialPageRoute(
                builder: (_) => ProfileEditScreen(
                  profile: original,
                  requireDistrict: true,
                  saveProfile: (_, data) async => changes = data,
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tapVisible(tester, find.text(droughtReportCategories.first));
    await tester.enterText(
      find.byKey(const ValueKey('report-description')),
      'My report draft stays here.',
    );
    await tapVisible(
      tester,
      find.byKey(const ValueKey('edit-report-district')),
      up: true,
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('profile-district')),
      'Tharparkar',
    );
    await tapVisible(tester, find.byKey(const ValueKey('save-profile')));
    await tester.pumpAndSettle();
    expect(changes, {'district': 'Tharparkar'});
    expect(find.text('My report draft stays here.'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Tharparkar'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('Tharparkar'), findsOneWidget);
    final chip = tester.widget<ChoiceChip>(
      find.widgetWithText(ChoiceChip, droughtReportCategories.first),
    );
    expect(chip.selected, isTrue);
    expect(repository.submits, 0);
  });

  testWidgets(
    'repeated submit taps issue one request and failure preserves draft',
    (tester) async {
      final repository = Reports()..pending = Completer<Complaint>();
      await tester.pumpWidget(
        app(
          SubmitComplaintScreen(
            profile: profile,
            service: ComplaintService(repository: repository),
          ),
        ),
      );
      await tapVisible(tester, find.text(droughtReportCategories.first));
      await tester.enterText(
        find.byKey(const ValueKey('report-description')),
        'Water shortage across our farms.',
      );
      await tapVisible(tester, find.byKey(const ValueKey('submit-report')));
      await tester.tap(find.byKey(const ValueKey('submit-report')));
      await tester.pump();
      expect(repository.submits, 1);
      repository.pending!.completeError(StateError('offline'));
      await tester.pumpAndSettle();
      expect(find.text('Water shortage across our farms.'), findsOneWidget);
      expect(
        find.text(
          'Could not confirm submission. Your entries are kept. Check report tracking before retrying.',
        ),
        findsOneWidget,
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('submit-report')),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<FilledButton>(find.byKey(const ValueKey('submit-report')))
            .onPressed,
        isNotNull,
      );
    },
  );

  testWidgets(
    'submission CMP confirmation details and back return to refreshed tracking',
    (tester) async {
      final repository = Reports()..pending = Completer<Complaint>();
      await tester.pumpWidget(
        app(
          ComplaintsScreen(
            profile: profile,
            service: ComplaintService(repository: repository),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text('Report Drought Situation'));
      await tester.pumpAndSettle();
      await tapVisible(tester, find.text(droughtReportCategories.first));
      await tester.enterText(
        find.byKey(const ValueKey('report-description')),
        'Water shortage across our farms.',
      );
      await tapVisible(tester, find.byKey(const ValueKey('submit-report')));
      final submitted = report('NEW');
      repository.rows = [submitted, ...repository.rows];
      repository.pending!.complete(submitted);
      await tester.pumpAndSettle();
      expect(find.text('Your ticket ID is CMP-NEW'), findsOneWidget);
      expect(
        repository.reads,
        1,
      ); // Refresh happens on return, not on replacement.
      await tester.tap(find.text('View report'));
      await tester.pumpAndSettle();
      expect(find.text('CMP-NEW'), findsOneWidget);
      expect(find.text('Drought report details'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Drought report tracking'), findsOneWidget);
      expect(repository.reads, 2);
      expect(repository.submits, 1);
      await tester.enterText(find.byType(TextField), 'CMP-NEW');
      await tester.pumpAndSettle();
      expect(find.byType(ComplaintCard), findsOneWidget);
    },
  );

  testWidgets(
    'search status filter clear history details refresh and back work',
    (tester) async {
      final repository = Reports();
      await tester.pumpWidget(
        app(
          ComplaintsScreen(
            profile: profile,
            service: ComplaintService(repository: repository),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'cmp-existing');
      await tester.pumpAndSettle();
      expect(find.byType(ComplaintCard), findsOneWidget);
      await tester.tap(find.byTooltip('Filter'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Resolved').last);
      await tester.pumpAndSettle();
      expect(find.text('No matching reports'), findsOneWidget);
      await tapVisible(tester, find.text('Clear search and filters'));
      await tester.pumpAndSettle();
      expect(find.byType(ComplaintCard), findsNWidgets(2));
      await tapVisible(tester, find.text('View History'));
      await tester.pumpAndSettle();
      expect(find.text('Report history'), findsWidgets);
      await tapVisible(tester, find.byType(ComplaintCard).first);
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Refresh status'));
      await tester.pumpAndSettle();
      expect(repository.details, 2);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Drought report tracking'), findsOneWidget);
      expect(repository.reads, greaterThanOrEqualTo(4));
    },
  );

  testWidgets(
    'failed report read is an error; retry empty is a distinct state',
    (tester) async {
      final repository = Reports()..readError = true;
      await tester.pumpWidget(
        app(
          ComplaintsScreen(
            profile: profile,
            service: ComplaintService(repository: repository),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Could not load reports'), findsOneWidget);
      expect(find.text('No drought reports yet'), findsNothing);
      repository.readError = false;
      repository.rows = [];
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();
      expect(find.text('No drought reports yet'), findsOneWidget);
      expect(find.text('Could not load reports'), findsNothing);
    },
  );

  for (final language in ['en', 'ur']) {
    testWidgets(
      '$language affected screens fit narrow phone and alerts are honestly unavailable',
      (tester) async {
        await LocalStorageService.setLanguage(language);
        tester.view.physicalSize = const Size(320, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(app(const AlertsScreen()));
        await tester.pumpAndSettle();
        expect(
          find.text(
            language == 'en'
                ? 'Live alerts unavailable'
                : 'لائیو انتباہات دستیاب نہیں',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(
          app(
            SubmitComplaintScreen(
              profile: profile,
              service: ComplaintService(repository: Reports()),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tapVisible(
          tester,
          find.text(WorkflowCopy.text(droughtReportCategories.first)),
        );
        await tester.enterText(
          find.byKey(const ValueKey('report-description')),
          'محفوظ رپورٹ کی تفصیل',
        );
        await tester.ensureVisible(find.byKey(const ValueKey('submit-report')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(WorkflowCopy.text('Submit report')), findsOneWidget);
      },
    );
  }
}
