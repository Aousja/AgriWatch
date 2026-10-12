import { useEffect, useRef, useState } from 'react';
import { service, sources } from './runtime.js';

const errorText = error => {
  if (error?.code === 'auth/captcha-check-failed' || error?.code === 'auth/unauthorized-domain') return 'Phone verification could not validate this site. Check that this staging hostname is authorized in Firebase and that reCAPTCHA can load, then request a fresh code.';
  if (error?.code === 'auth/credential-already-in-use' || error?.code === 'auth/account-exists-with-different-credential' || error?.code === 'auth/email-already-in-use') return 'That Google account belongs to another identity. No accounts were merged. Keep this phone account or choose another Google account.';
  return error?.code ? `Unable to complete this step (${error.code}). Try again.` : error?.message || 'Unable to complete this step.';
};
export default function StageSignIn() {
  const [user, setUser] = useState(undefined);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [audience, setAudience] = useState('farmer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [access, setAccess] = useState(null);
  const [portal, setPortal] = useState(null);
  const [accessError, setAccessError] = useState('');
  const [otpVerifiedUid, setOtpVerifiedUid] = useState(null);
  const [dataError, setDataError] = useState('');
  const captcha = useRef(null);
  const epoch = useRef(0);
  const currentUid = useRef(undefined);
  useEffect(() => {
    const stop = service.observe(current => {
      if (currentUid.current !== (current?.uid ?? null)) {
        currentUid.current = current?.uid ?? null;
        epoch.current++;
        setSnapshot(null);
        setAccess(null);
        setPortal(null);
        setAccessError('');
        setOtpVerifiedUid(null);
        setDataError('');
      }
      setUser(current);
    });
    return () => { stop(); service.dispose(); };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const version = epoch.current;
    service.resolveAccess().then(result => {
      if (!active || version !== epoch.current) return;
      setAccessError(''); setAccess(result);
      setPortal(current => result.portal || (result.status === 'choice' && result.storedRoles.includes(current) ? current : null));
    }).catch(failure => {
      if (active && version === epoch.current) {
        setAccess(null); setPortal(null); setSnapshot(null); setAccessError(errorText(failure));
      }
    });
    service.snapshot().then(result => {
      if (active && version === epoch.current) { setDataError(''); setSnapshot(result); }
    }).catch(failure => {
      if (active && version === epoch.current) { setSnapshot(null); setDataError(errorText(failure)); }
    });
    return () => { active = false; };
  }, [user]);
  async function run(action) {
    setError(''); setBusy(true);
    try { await action(); } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  async function load() {
    setSnapshot(null);
    const version = epoch.current;
    const result = await service.snapshot();
    if (version === epoch.current) setSnapshot(result);
  }
  function exportEvidence() {
    const content = JSON.stringify({ firebaseUid: snapshot.firebaseUid, observedAt: snapshot.observedAt, providers: snapshot.providers, webPhoneOtp: otpVerifiedUid === snapshot.firebaseUid ? 'verified-this-page' : 'restored-session: fresh OTP not observed on this page', access, sources, reports: { status: snapshot.reports.status, code: snapshot.reports.code, count: snapshot.reports.data?.length, data: snapshot.reports.data?.map(({ id, ref, status }) => ({ id, ref, status })) }, profile: { status: snapshot.profile.status, code: snapshot.profile.code, exists: snapshot.profile.status === 'read' ? !!snapshot.profile.data : undefined, storedRole: snapshot.profile.status === 'read' ? snapshot.profile.data?.role ?? null : undefined }, accessRequests: { status: snapshot.accessRequests.status, code: snapshot.accessRequests.code, count: snapshot.accessRequests.data?.length }, mobileWebPhoneOtp: 'PENDING: mobile UID and CMP report must be independently observed', googleLink: snapshot.providers.includes('google.com') ? 'provider linked; compare UID before/after separately' : 'pending' }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'staged-web-observations.json'; link.click(); URL.revokeObjectURL(url);
  }
  return <main className="stage-shell">
    <a href="/">AgriWatch</a>
    <h1>Farmer and public sign-in preview</h1>
    <p>Use your mobile phone account to see your saved reports here.</p>
    {!user && <><label>Portal <select value={audience} disabled={busy} onChange={e => setAudience(e.target.value)}><option value="farmer">Farmer</option><option value="public">General public</option></select></label><p>Your saved membership determines which portal opens after sign-in.</p></>}
    {user === undefined ? <p>Checking saved sign-in…</p> : !user ? <>
      <form onSubmit={e => { e.preventDefault(); run(async () => { setSent(false); setOtp(''); await service.sendOtp(phone.trim(), captcha.current); setSent(true); }); }}>
        <label>Phone number <input type="tel" autoComplete="tel" placeholder="+923001234567" value={phone} disabled={busy} onChange={e => { setPhone(e.target.value); setSent(false); }} /></label>
        <p>Google stores and uses phone numbers to help prevent spam and abuse. SMS rates may apply.</p>
        <button disabled={busy}>Send SMS code</button>
      </form>
      {sent && <form onSubmit={e => { e.preventDefault(); run(async () => { const verified = await service.confirmOtp(otp); setOtpVerifiedUid(verified.uid); setPhone(''); setOtp(''); setSent(false); }); }}>
        <label>SMS code <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} disabled={busy} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} /></label>
        <button disabled={busy}>Verify and sign in</button>
      </form>}
    </> : <>
      {!access && !accessError && <p role="status">Checking your saved memberships…</p>}
      {accessError && <p role="alert">Unable to read your saved memberships. {accessError}</p>}
      {access?.status === 'setup' && <section><h2>Set up your profile</h2><p>No Farmer or General Public membership is stored for this account. Complete profile setup in the mobile app, then sign in again.</p></section>}
      {access?.status === 'choice' && <label>Choose your portal <select value={portal || ''} disabled={busy} onChange={e => { const choice = e.target.value; if (access.storedRoles.includes(choice)) setPortal(choice); }}><option value="" disabled>Choose a saved membership</option>{access.storedRoles.map(role => <option key={role} value={role}>{role === 'farmer' ? 'Farmer' : 'General Public'}</option>)}</select></label>}
      {portal && <h2>{portal === 'farmer' ? 'Farmer' : 'General Public'} portal</h2>}
      {access && <p>Stored profile role: <code>{access.storedProfileRole || 'none'}</code></p>}
      <p>Firebase UID: <code>{user.uid}</code></p>
      <button disabled={busy || user.providerData.some(p => p.providerId === 'google.com')} onClick={() => run(async () => { await service.linkGoogle(); setSnapshot(null); })}>Link my Google account</button>
      <button disabled={busy} onClick={() => run(load)}>Reload my saved data</button>
      <button disabled={busy} onClick={() => run(async () => { setSnapshot(null); await service.signOut(); })}>Sign out</button>
      {!snapshot && !dataError && <p role="status">Loading your CMP reports, profile, and access requests…</p>}
      {dataError && <p role="alert">Saved-data check failed: {dataError}</p>}
      {snapshot && <>
        <h2>CMP reports</h2>
        {snapshot.reports.status === 'error' ? <p>Report read failed: {snapshot.reports.code}</p> : snapshot.reports.data.length === 0 ? <p>No reports found for this Firebase account.</p> : snapshot.reports.data.map(report => <article key={report.id}><h3>{report.ref}</h3><p>{report.category} — {report.status}</p><p>{report.description}</p><p>{report.resolution_note}</p><p>{report.pdma_response_note}</p><p>Report ID: {report.id}</p></article>)}
        <h2>Profile</h2><p>{snapshot.profile.status === 'error' ? `Profile read failed: ${snapshot.profile.code}` : snapshot.profile.data ? `Stored role: ${snapshot.profile.data.role || 'none'}` : 'No profile found.'}</p>
        <h2>Access-request history</h2>{snapshot.accessRequests.status === 'error' ? <p>History read failed: {snapshot.accessRequests.code}</p> : snapshot.accessRequests.data.length === 0 ? <p>No access requests found for this Firebase account.</p> : snapshot.accessRequests.data.map((request, index) => <p key={request.sourceDocumentId || request.id || index}>{request.requestedRole || request.role}: {request.status}</p>)}
        <button onClick={exportEvidence}>Download web observations</button>
      </>}
    </>}
    <div ref={captcha} />
    {busy && <p role="status">Working…</p>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
