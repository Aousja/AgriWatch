// New submission choices only. Preserve the category string on legacy rows.
export function complaintFromRow(row) {
  return {
    dbId: row.id,
    id: row.ref || row.id,
    farmer: row.reporter_name || "Anonymous",
    role: row.reporter_role || "farmer",
    phone: row.reporter_phone || "",
    district: row.district || "—",
    category: row.category || "Other",
    cropType: row.crop_type || "",
    description: row.description || "",
    photo: row.photo_url || null,
    status: row.status || "Under Review",
    displayStatus: reportStatus(row),
    workflowStatus: row.resolved_at || row.status === 'Resolved' ? 'Resolved'
      : row.pdma_assigned_at && row.pdma_assigned_to ? 'Assigned for PDMA review'
      : row.review_started_at ? 'Under Review' : 'Submitted',
    reviewStartedAt: row.review_started_at || null,
    assignedTo: row.pdma_assigned_to || null,
    assignedAt: row.pdma_assigned_at || null,
    resolvedAt: row.resolved_at || null,
    respondedAt: row.admin_responded_at || null,
    pdmaReviewStartedAt: row.pdma_review_started_at || null,
    pdmaReviewStartedBy: row.pdma_review_started_by || null,
    pdmaResponseNote: row.pdma_response_note || '',
    pdmaRespondedAt: row.pdma_responded_at || null,
    pdmaRespondedBy: row.pdma_responded_by || null,
    resolutionNote: row.resolution_note || "",
    handledBy: row.handled_by || "",
    userId: row.user_id || null,
    date: (row.created_at || new Date().toISOString()).slice(0, 10),
    createdAt: row.created_at,
  };
}

export const DROUGHT_REPORT_CATEGORIES = [
  'Prolonged water shortage affecting an area or multiple farms',
  'Observed drought conditions affecting a community',
  'Incorrect or missing AgriWatch drought alert',
  'Other drought-related situation',
];

export function reportStatus(row) {
  if (row.resolved_at) return 'Resolved';
  if (row.status === 'Resolved') return 'Resolved (legacy record)';
  if (row.pdma_review_started_at && row.pdma_review_started_by === row.pdma_assigned_to && row.pdma_review_started_at >= row.pdma_assigned_at) return 'PDMA review started';
  if (row.pdma_assigned_at && row.pdma_assigned_to) return 'Assigned for PDMA review';
  if (row.review_started_at) return 'AgriWatch review started';
  if (row.status === 'Forwarded') return 'Legacy status: Forwarded';
  return 'Awaiting AgriWatch review';
}

export function isPermittedAssignment(report, userId, districts) {
  return Boolean(userId && report.assignedTo === userId && report.assignedAt && districts.includes(report.district));
}
