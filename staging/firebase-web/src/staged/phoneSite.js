export async function checkPhoneSite({ hostname, config, fetchConfig }) {
  const project = await fetchConfig();
  if (!project.projectId || project.projectId !== config.projectId) throw new Error('Firebase project ID does not match this app.');
  if (!project.messagingSenderId || String(project.messagingSenderId) !== String(config.messagingSenderId)) throw new Error('Firebase messaging sender ID does not match this app.');
  if (!project.projectNumber || String(project.authProjectNumber) !== String(project.projectNumber)) throw new Error('Firebase Authentication project number does not match the verified staging project.');
  const domains = project.authorizedDomains || [];
  if (!domains.includes(config.authDomain) || !domains.includes(hostname)) {
    throw Object.assign(new Error('This staging hostname is missing from Firebase Authentication authorized domains. Phone verification cannot start until its configuration is corrected.'), { code: 'auth/unauthorized-domain' });
  }
}
