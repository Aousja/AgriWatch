import { initializeApp } from 'firebase/app';
import * as sdk from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createFirebaseDataClient } from './dataClient.js';
import { createIdentityService } from './identityService.js';
import { checkPhoneSite } from './phoneSite.js';
import { stagingProjectIdentity } from './projectIdentity.js';

if (import.meta.env.MODE !== 'staging' || import.meta.env.VITE_STAGED_FIREBASE_AUTH !== 'true') {
  throw new Error('This sign-in flow requires an explicit staging build.');
}
const projectId = 'agriwatch-pakistan';
const app = initializeApp({
  projectId,
  apiKey: 'AIzaSyBv2fQsykl1DgPsSnKCcVd6Qf8yh8vhoi4',
  authDomain: 'agriwatch-pakistan.firebaseapp.com',
  appId: '1:603632933825:web:fbe63f109613f0616bad40',
  messagingSenderId: '603632933825',
}, 'farmer-public-staging');
export const auth = sdk.getAuth(app);
const db = getFirestore(app);
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (new URL(url).hostname !== 'gtbfmrefgwodphjurvdq.supabase.co') throw new Error('Staging must use the mobile Supabase project.');
const client = createFirebaseDataClient({ url, key, auth });
export const sources = {
  profile: import.meta.env.VITE_STAGED_PROFILE_SOURCE || 'firestore',
  accessRequests: import.meta.env.VITE_STAGED_ACCESS_REQUEST_SOURCE || 'firestore',
};
if (Object.values(sources).some(value => !['firestore', 'supabase'].includes(value))) throw new Error('Invalid storage source.');
async function rows(table, uid) {
  const { data, error } = await client.from(table).select('*').eq('firebase_uid', uid);
  if (error) throw error;
  return data || [];
}
export const service = createIdentityService({
  auth, sdk, client,
  checkPhoneSite: () => checkPhoneSite({
    hostname: window.location.hostname,
    config: app.options,
    fetchConfig: async () => {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${app.options.apiKey}`);
      if (!response.ok) throw new Error('Unable to check Firebase phone verification configuration. Try again.');
      const publicConfig = await response.json();
      return {
        ...stagingProjectIdentity,
        authProjectNumber: publicConfig.projectId,
        authorizedDomains: publicConfig.authorizedDomains,
      };
    },
  }),
  readProfile: async uid => {
    if (sources.profile === 'supabase') {
      const data = await rows('mobile_firebase_profiles', uid);
      if (data.length > 1) throw new Error('Multiple profiles found.');
      return data[0] || null;
    }
    const snapshot = await getDoc(doc(db, 'user_profiles', uid));
    if (!snapshot.exists()) return null;
    const profile = snapshot.data();
    if (profile.uid != null && profile.uid !== uid) throw new Error('Profile ownership mismatch.');
    return { ...profile, uid };
  },
  readRequests: async uid => {
    if (sources.accessRequests === 'supabase') return rows('access_requests', uid);
    const snapshot = await getDocs(query(collection(db, 'access_requests'), where('uid', '==', uid)));
    return snapshot.docs.map(item => ({ ...item.data(), sourceDocumentId: item.id }));
  },
});
