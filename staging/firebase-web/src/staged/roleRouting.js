// Stored personal memberships only. The database claim `authenticated`, staff
// claims, signup requests and the pre-login portal hint are not memberships.
export function personalRole(value) {
  if (value === 'farmer') return 'farmer';
  if (value === 'citizen' || value === 'public') return 'public';
  return null;
}

export function profileMemberships(uid, profile) {
  if (!profile) return [];
  if ((profile.uid && profile.uid !== uid) || (profile.firebase_uid && profile.firebase_uid !== uid)) {
    throw new Error('Profile ownership mismatch.');
  }
  const role = personalRole(profile.role);
  // The existing Firebase profile schema has one membership in `role`.
  // Do not infer additional memberships from legacy Supabase registrations.
  return role ? [{ uid, role }] : [];
}

export function resolvePortal(uid, memberships) {
  const roles = new Set();
  for (const membership of memberships) {
    if (membership.uid !== uid) throw new Error('Membership ownership mismatch.');
    const role = personalRole(membership.role);
    if (role) roles.add(role);
  }
  const storedRoles = ['farmer', 'public'].filter(role => roles.has(role));
  return {
    status: storedRoles.length === 2 ? 'choice' : storedRoles.length === 1 ? 'portal' : 'setup',
    portal: storedRoles.length === 1 ? storedRoles[0] : null,
    storedRoles,
  };
}
