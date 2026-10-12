import { createClient } from '@supabase/supabase-js';

export function createFirebaseDataClient({ url, key, auth, fetch }) {
  return createClient(url, key, {
    accessToken: async () => auth.currentUser?.getIdToken(false) ?? null,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'firebase-staging-unused' },
    ...(fetch ? { global: { fetch } } : {}),
  });
}
