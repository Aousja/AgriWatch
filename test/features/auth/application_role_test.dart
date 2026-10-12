import 'package:flutter_test/flutter_test.dart';
import 'package:agriwatch/features/auth/services/application_role.dart';
import 'package:agriwatch/core/config/app_config.dart';

void main() {
  test('phone auth and returning sessions use production defaults', () {
    expect(AppConfig.useFirebaseOTP, isTrue);
    expect(AppConfig.forceLoginScreenOnStartup, isFalse);
  });
  test('reserved database role is never treated as application authority', () {
    expect(
      ApplicationRole.effective('pdma_officer', {'role': 'authenticated'}),
      'citizen',
    );
    expect(
      ApplicationRole.effective('admin', {
        'role': 'admin',
        'agriwatch_role': 'admin',
      }),
      'citizen',
    );
    expect(
      ApplicationRole.effective('farmer', {'role': 'authenticated'}),
      'farmer',
    );
  });
  test('trusted refreshed role grants access and claim removal revokes it', () {
    expect(
      ApplicationRole.effective('citizen', {
        'role': 'authenticated',
        'agriwatch_role': 'pdma_officer',
      }),
      'pdma_officer',
    );
    expect(
      ApplicationRole.effective('pdma_officer', {'role': 'authenticated'}),
      'citizen',
    );
  });
}
