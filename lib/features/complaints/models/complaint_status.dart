enum ComplaintStatus {
  submitted,
  assigned,
  underReview,
  inProgress,
  resolved,
  rejected,
  legacyForwarded,
}

extension ComplaintStatusX on ComplaintStatus {
  String get label => switch (this) {
    ComplaintStatus.submitted => 'Submitted',
    ComplaintStatus.assigned => 'Assigned for PDMA review',
    ComplaintStatus.underReview => 'AgriWatch review started',
    ComplaintStatus.inProgress => 'In Progress',
    ComplaintStatus.resolved => 'Resolved',
    ComplaintStatus.rejected => 'Rejected',
    ComplaintStatus.legacyForwarded => 'Legacy status: Forwarded',
  };

  static ComplaintStatus fromValue(Object? value) => switch (value) {
    'assigned' => ComplaintStatus.assigned,
    'Under Review' => ComplaintStatus.underReview,
    'Forwarded' => ComplaintStatus.legacyForwarded,
    'Assigned for PDMA review' => ComplaintStatus.assigned,
    'Resolved' => ComplaintStatus.resolved,
    'underReview' => ComplaintStatus.underReview,
    'inProgress' => ComplaintStatus.inProgress,
    'resolved' => ComplaintStatus.resolved,
    'rejected' => ComplaintStatus.rejected,
    _ => ComplaintStatus.submitted,
  };
}
