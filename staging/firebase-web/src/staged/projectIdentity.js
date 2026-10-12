// Expected staging Firebase identity. Project ID/number verified through Cloud
// Resource Manager; sender ID matches the existing mobile/web Firebase config.
// The legacy Identity Toolkit public response calls its numeric project number
// `projectId`. Normalize that field as authProjectNumber, never as a sender ID.
export const stagingProjectIdentity = Object.freeze({
  projectId: 'agriwatch-pakistan',
  projectNumber: '603632933825',
  messagingSenderId: '603632933825',
});
