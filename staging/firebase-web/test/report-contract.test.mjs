import test from 'node:test';
import assert from 'node:assert/strict';
import { DROUGHT_REPORT_CATEGORIES, reportStatus, isPermittedAssignment, complaintFromRow } from '../src/supabase/reportContract.js';

test('legacy reference and category are returned verbatim', () => {
  const row = { id: 'old', ref: 'CMP-7A1E716B604A', category: 'Pest infestation', status: 'Under Review' };
  const report = complaintFromRow(row);
  assert.equal(report.id, row.ref);
  assert.equal(report.category, row.category);
  assert.equal(report.displayStatus, 'Awaiting AgriWatch review');
});

test('new submission excludes historic damage categories', () => {
  assert.equal(DROUGHT_REPORT_CATEGORIES.length, 4);
  for (const category of ['Pest infestation', 'Crop damage', 'Crop Failure', 'Livestock Loss']) {
    assert.equal(DROUGHT_REPORT_CATEGORIES.includes(category), false);
  }
});
test('default and legacy status do not invent completed actions', () => {
  assert.equal(reportStatus({ status: 'Under Review' }), 'Awaiting AgriWatch review');
  assert.equal(reportStatus({ status: 'Forwarded' }), 'Legacy status: Forwarded');
  assert.equal(reportStatus({ status: 'Resolved' }), 'Resolved (legacy record)');
  assert.equal(reportStatus({ review_started_at: 'stored' }), 'AgriWatch review started');
  assert.equal(reportStatus({ pdma_assigned_at: 'stored', pdma_assigned_to: 'officer' }), 'Assigned for PDMA review');
});
test('PDMA requires explicit assignment, matching user and permitted district', () => {
  const report = { assignedTo: 'verified', assignedAt: 'stored', district: 'Tharparkar' };
  assert.equal(isPermittedAssignment(report, 'verified', ['Tharparkar']), true);
  assert.equal(isPermittedAssignment(report, 'verified', ['Badin']), false);
  assert.equal(isPermittedAssignment(report, 'other', ['Tharparkar']), false);
  assert.equal(isPermittedAssignment({ ...report, assignedAt: null }, 'verified', ['Tharparkar']), false);
  assert.equal(isPermittedAssignment(report, 'verified', []), false);
});
