import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:agriwatch/features/complaints/widgets/complaint_category_selector.dart';
import 'package:agriwatch/features/complaints/widgets/complaint_card.dart';
import 'package:agriwatch/features/complaints/models/complaint.dart';
import 'package:agriwatch/features/complaints/models/complaint_status.dart';
import 'package:agriwatch/features/complaints/models/report_categories.dart';

void main() {
  final legacy = <String, dynamic>{
    'id': 'legacy-row',
    'ref': 'CMP-7A1E716B604A',
    'category': 'Pest infestation',
    'description': 'Stored legacy report',
    'status': 'Under Review',
    'created_at': '2026-10-07T10:00:00Z',
  };

  test('legacy category and CMP reference survive unchanged', () {
    final report = Complaint.fromSupabase(legacy);
    expect(report.ticketId, 'CMP-7A1E716B604A');
    expect(report.category, 'Pest infestation');
    expect(droughtReportCategories, hasLength(4));
    expect(droughtReportCategories, isNot(contains(report.category)));
    expect(droughtReportCategories, isNot(contains('Crop damage')));
  });

  test('default Under Review proves no completed review or referral', () {
    final report = Complaint.fromSupabase(legacy);
    expect(report.status, ComplaintStatus.submitted);
    expect(report.timeline.where((e) => e.date != null), hasLength(1));
    expect(report.timeline.last.title, 'Awaiting AgriWatch review');
    expect(report.timeline.any((e) => e.title.contains('PDMA')), isFalse);
  });

  test('only stored actions create completed tracking steps', () {
    final report = Complaint.fromSupabase({
      ...legacy,
      'status': 'Resolved',
      'review_started_at': '2026-10-07T11:00:00Z',
      'pdma_assigned_at': '2026-10-07T12:00:00Z',
      'pdma_assigned_to': 'verified-reviewer',
      'resolved_at': '2026-10-07T13:00:00Z',
    });
    expect(report.timeline, hasLength(4));
    expect(report.timeline.every((e) => e.date != null), isTrue);
    expect(report.assignedOfficer, 'verified-reviewer');
  });

  test(
    'legacy Forwarded neither fabricates assignment nor completion time',
    () {
      final report = Complaint.fromSupabase({...legacy, 'status': 'Forwarded'});
      expect(report.status, ComplaintStatus.legacyForwarded);
      expect(report.assignedOfficer, isNull);
      expect(report.timeline.where((e) => e.date != null), hasLength(1));
    },
  );

  testWidgets('new categories and long tracking labels fit a narrow phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListView(
            children: [
              ComplaintCategorySelector(selected: null, onSelected: (_) {}),
              ComplaintCard(
                complaint: Complaint.fromSupabase({
                  ...legacy,
                  'category': droughtReportCategories.first,
                  'status': 'Assigned for PDMA review',
                  'pdma_assigned_to': 'verified',
                  'pdma_assigned_at': '2026-10-08T10:00:00Z',
                }),
                district: 'Tharparkar',
                onTap: () {},
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Pest infestation'), findsNothing);
    for (final category in droughtReportCategories) {
      expect(find.text(category), findsWidgets);
    }
    expect(tester.takeException(), isNull);
  });
}
