import 'package:flutter_test/flutter_test.dart';

import 'package:agriwatch/core/config/supabase_config.dart';
import 'package:agriwatch/core/services/supabase_bridge.dart';
import 'package:agriwatch/features/profile/screens/settings_screen.dart';

void main() {
  test('bridge stays inert when build-time Supabase settings are absent', () {
    expect(SupabaseConfig.isConfigured, isFalse);
    expect(SupabaseConfig.useSupabaseProfiles, isFalse);
    expect(SupabaseBridge, isNotNull);
    expect(const SettingsScreen(), isNotNull);
  });
}
