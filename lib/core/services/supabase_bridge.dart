import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/supabase_config.dart';

/// The additive Firebase Auth -> Supabase third-party-auth bridge.
class SupabaseBridge {
  SupabaseBridge._();

  static Future<void> initialize() async {
    if (!SupabaseConfig.isConfigured) {
      if (kDebugMode) {
        debugPrint(
          'Supabase bridge is not configured. Pass SUPABASE_URL and '
          'SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) at build time.',
        );
      }
      return;
    }

    await Supabase.initialize(
      url: SupabaseConfig.url,
      publishableKey: SupabaseConfig.publishableKey,
      accessToken: () async {
        return FirebaseAuth.instance.currentUser?.getIdToken(false);
      },
    );
  }

  /// Wait for the async user-creation function to assign the claim Supabase
  /// requires, then force Firebase to issue a token containing it.
  ///
  /// Existing users must be backfilled separately; this retry only covers the
  /// short delivery delay for users created after the function is deployed.
  static Future<void> refreshTokenAfterClaimAssignment() async {
    if (!SupabaseConfig.isConfigured) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    for (var attempt = 0; attempt < 8; attempt++) {
      final tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims?['role'] == 'authenticated') return;

      if (attempt < 7) {
        await Future<void>.delayed(const Duration(seconds: 1));
      }
    }

    throw StateError(
      'Firebase signed in, but the Supabase authenticated claim was not '
      'available. Deploy the Auth trigger and backfill this test user.',
    );
  }

  /// Refreshes the Firebase application-role claim after a trusted approval.
  /// The reserved Firebase/Supabase bridge claim remains `authenticated`.
  static Future<String?> refreshApplicationRole() async {
    if (!SupabaseConfig.isConfigured) return null;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;

    final tokenResult = await user.getIdTokenResult(true);
    final role = tokenResult.claims?['agriwatch_role'];
    if (role == 'pdma_officer' || role == 'ngo') return role as String;
    return null;
  }

  /// Inserts and reads one row from the isolated bridge verification table.
  /// This is intentionally separate from all production application tables.
  static Future<Map<String, dynamic>> verifyIsolatedRoundTrip() async {
    if (!SupabaseConfig.isConfigured) {
      throw StateError('Supabase is not configured for this build.');
    }

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw StateError('A Firebase user must be signed in first.');
    }

    final tokenResult = await user.getIdTokenResult(true);
    if (tokenResult.claims?['role'] != 'authenticated') {
      throw StateError(
        'Firebase sign-in succeeded, but the ID token does not contain '
        'role: authenticated. Refresh the session after the claim backfill.',
      );
    }

    final client = Supabase.instance.client;
    final inserted = await client
        .from('firebase_bridge_test_rows')
        .insert({
          'owner_uid': user.uid,
          'payload': 'agriwatch-bridge-${DateTime.now().toUtc().toIso8601String()}',
        })
        .select('id, owner_uid, payload, created_at')
        .single();

    final selected = await client
        .from('firebase_bridge_test_rows')
        .select('id, owner_uid, payload, created_at')
        .eq('id', inserted['id'])
        .single();

    if (selected['owner_uid'] != user.uid) {
      throw StateError('The Supabase RLS result belongs to another user.');
    }

    return selected;
  }
}
