/// Application access is separate from Supabase's reserved database role.
class ApplicationRole {
  const ApplicationRole._();

  static String? trusted(Map<String, dynamic>? claims) {
    if (claims?['role'] != 'authenticated') return null;
    final role = claims?['agriwatch_role'];
    return {'pdma_officer', 'ngo', 'admin'}.contains(role)
        ? role as String
        : null;
  }

  static String effective(String? storedRole, Map<String, dynamic>? claims) {
    return trusted(claims) ?? (storedRole == 'farmer' ? 'farmer' : 'citizen');
  }
}
