import { profileMemberships, resolvePortal } from './roleRouting.js';

export function createIdentityService({ auth, sdk, client, readProfile, readRequests, readMemberships = profileMemberships, checkPhoneSite = async () => {}, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  let verifier;
  let confirmation;
  const requireUser = () => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) throw new Error('Sign in with phone OTP first.');
    return user;
  };
  async function ready(user) {
    for (let attempt = 0; attempt < 8; attempt++) {
      if (auth.currentUser?.uid !== user.uid) throw new Error('The signed-in account changed.');
      const result = await user.getIdTokenResult(true);
      if (result.claims.role === 'authenticated') return;
      if (attempt < 7) await delay(1000);
    }
    throw new Error('Firebase signed in, but the Supabase authenticated claim is missing. No accounts were changed.');
  }
  function clearVerifier() {
    verifier?.clear();
    verifier = undefined;
  }
  return {
    observe: callback => sdk.onIdTokenChanged(auth, callback),
    async sendOtp(phone, container) {
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Use an international phone number, for example +923001234567.');
      if (auth.currentUser) throw new Error('Sign out before signing into another phone account.');
      confirmation = undefined;
      clearVerifier();
      await checkPhoneSite();
      // Firebase supplies the site key and invokes its normal interactive challenge when needed.
      verifier = new sdk.RecaptchaVerifier(auth, container, { size: 'invisible' });
      try {
        confirmation = await sdk.signInWithPhoneNumber(auth, phone, verifier);
      } catch (error) {
        clearVerifier();
        throw error;
      }
    },
    async confirmOtp(code) {
      if (!confirmation) throw new Error('Request a new SMS code.');
      if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit SMS code.');
      const result = await confirmation.confirm(code);
      confirmation = undefined;
      clearVerifier();
      await ready(result.user);
      return result.user;
    },
    async resolveAccess() {
      const user = requireUser();
      await ready(user);
      const uid = user.uid;
      const profile = await readProfile(uid);
      // Validate the profile even when a separate membership reader is used.
      profileMemberships(uid, profile);
      const memberships = await readMemberships(uid, profile);
      if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
      return { firebaseUid: uid, storedProfileRole: profile?.role ?? null, ...resolvePortal(uid, memberships) };
    },
    async linkGoogle() {
      const user = requireUser();
      const uid = user.uid;
      const provider = new sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // Never fall back to Google sign-in, email/phone matching, unlinking, or account migration.
      const result = await sdk.linkWithPopup(user, provider);
      if (result.user.uid !== uid || auth.currentUser?.uid !== uid) throw new Error('Account identity changed; verification stopped.');
      await ready(result.user);
      return result.user;
    },
    async snapshot() {
      const user = requireUser();
      await ready(user);
      const uid = user.uid;
      const settled = await Promise.allSettled([
        client.from('complaints').select('*').eq('firebase_uid', uid).order('created_at', { ascending: false }).then(({ data, error }) => {
          if (error) throw error;
          if ((data || []).some(row => row.firebase_uid !== uid)) throw new Error('Report ownership mismatch.');
          return data || [];
        }),
        readProfile(uid), readRequests(uid),
      ]);
      if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed.');
      return {
        firebaseUid: uid,
        observedAt: new Date().toISOString(),
        providers: user.providerData.map(provider => provider.providerId),
        ...Object.fromEntries(['reports', 'profile', 'accessRequests'].map((key, index) => {
          const result = settled[index];
          return [key, result.status === 'fulfilled'
            ? { status: 'read', data: result.value }
            : { status: 'error', code: result.reason?.code || 'read-failed' }];
        })),
      };
    },
    async signOut() {
      confirmation = undefined;
      clearVerifier();
      await sdk.signOut(auth);
    },
    dispose: clearVerifier,
  };
}
