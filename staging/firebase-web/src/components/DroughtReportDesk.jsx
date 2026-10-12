import { useEffect, useState } from 'react';
import Card, { StatusBadge } from './Card';
import { useComplaints } from '../store/ComplaintsContext';
import { useSupabaseAuth } from '../supabase/useSupabaseAuth';
import { fetchReportReviewers } from '../supabase/complaintsApi';
import { isPermittedAssignment } from '../supabase/reportContract';

export default function DroughtReportDesk({ pdma = false }) {
  const { complaints, loading, error, access, reviewReport, reload } = useComplaints();
  const { user } = useSupabaseAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [assignee, setAssignee] = useState('');
  const [serious, setSerious] = useState(false);
  const [reviewerState, setReviewerState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const admin = !pdma && access?.admin === true;
  const reviewers = admin && reviewerState?.userId === user?.id ? reviewerState.rows : [];
  const reports = pdma ? complaints.filter(c => isPermittedAssignment(c, user?.id, access?.districts || [])) : admin ? complaints : [];
  const selected = reports.find(c => c.dbId === selectedId);

  useEffect(() => {
    let cancelled = false;
    if (admin) fetchReportReviewers().then(rows => {
      if (!cancelled) setReviewerState({ userId: user.id, rows });
    }).catch(() => { if (!cancelled) setMessage('Verified PDMA reviewers could not be loaded. Assignment is unavailable.'); });
    return () => { cancelled = true; };
  }, [admin, user?.id]);

  function open(report) {
    setSelectedId(report.dbId);
    setNote((pdma ? report.pdmaResponseNote : report.resolutionNote) || '');
    setReason(''); setAssignee(''); setSerious(false); setMessage('');
  }

  async function act(action) {
    if (!selected || (!admin && !pdma) || busy) return;
    if (action === 'resolve' && !window.confirm('Record this report as resolved? The reporter will see your response and the stored resolution.')) return;
    setBusy(true); setMessage('');
    try {
      await reviewReport(selected.dbId, action, note, action === 'assign' ? assignee : null, action === 'assign' ? reason : '');
      setMessage(action === 'assign' ? 'Assignment recorded for PDMA review.' : `${pdma ? 'PDMA' : 'Admin'} action saved.`);
    } catch (err) {
      setMessage(err.message || 'The action could not be saved.');
    } finally { setBusy(false); }
  }

  return <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-5">
    <h1 className="font-display text-xl font-semibold">{pdma ? 'Assigned drought reports' : 'Drought situation reports'}</h1>
    <p className="text-sm text-ink/60">{pdma ? 'Only explicit assignments to your verified account within your permitted districts appear here.' : 'Every new report first enters AgriWatch admin review. Review, respond, and explicitly assign serious drought situations for PDMA review.'}</p>
    <button className="border rounded-lg px-3 py-2" onClick={reload}>Refresh reports</button>
    {error && <p role="alert">Reports are unavailable: {error.message}</p>}
    {!loading && !error && !admin && !pdma && <p>Authorized AgriWatch admin access is required.</p>}
    {loading ? <p>Loading reports...</p> : reports.length === 0 ? <p>No permitted reports to display.</p> : reports.map(c => <Card key={c.dbId}>
      <div className="flex flex-wrap gap-3 justify-between"><h2>{c.category}</h2><StatusBadge status={c.displayStatus} /></div>
      <p className="text-xs mt-2">{c.id} · {c.district} · {c.date}</p>
      <p className="mt-2 whitespace-pre-wrap">{c.description}</p>
      <button className="border rounded-lg px-3 py-2 mt-3" onClick={() => open(c)}>View report</button>
    </Card>)}
    {selected && <Card>
      <div className="flex justify-between"><h2>{selected.id}</h2><button onClick={() => setSelectedId(null)}>Close</button></div>
      <p className="mt-2">{selected.category} · {selected.district} · {selected.farmer}</p>
      {selected.phone && <p>{selected.phone}</p>}
      {selected.cropType && <p>Crop: {selected.cropType}</p>}
      <p className="whitespace-pre-wrap mt-3">{selected.description}</p>
      {selected.photo && <img src={selected.photo} alt="Report evidence" className="max-h-80 mt-3 rounded-lg" />}
      {selected.reviewStartedAt && <p>AgriWatch review started: {selected.reviewStartedAt}</p>}
      {selected.assignedAt && <p>Assigned for PDMA review: {selected.assignedAt}. Government action is not confirmed.</p>}
      {selected.resolvedAt && <p>Resolution recorded: {selected.resolvedAt}</p>}
      {selected.resolutionNote && <p className="mt-3">{selected.respondedAt ? "AgriWatch admin response: " : "Recorded response: "}{selected.resolutionNote}</p>}
      {selected.pdmaResponseNote && <p className="mt-3">PDMA response: {selected.pdmaResponseNote}</p>}
      {selected.pdmaRespondedAt && <p>PDMA response recorded: {selected.pdmaRespondedAt}</p>}
      {pdma && <div className="space-y-3 mt-4">
        <label className="block">PDMA response<textarea className="block border rounded-lg p-2 w-full" value={note} maxLength={5000} onChange={e => setNote(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy || Boolean(selected.resolvedAt)} onClick={() => act('start_review')}>Start PDMA review</button>
          <button disabled={busy || !note.trim() || Boolean(selected.resolvedAt)} onClick={() => act('respond')}>Save PDMA response</button>
          <button disabled={busy || !note.trim() || Boolean(selected.resolvedAt)} onClick={() => act('resolve')}>Mark resolved</button>
        </div>
        <p className="text-xs">Start review before responding. Only the admin can assign or reassign reports.</p>
      </div>}
      {admin && <div className="space-y-3 mt-4">
        <label className="block">Admin response<textarea className="block border rounded-lg p-2 w-full" value={note} onChange={e => setNote(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy || Boolean(selected.reviewStartedAt) || Boolean(selected.resolvedAt)} onClick={() => act('start_review')}>Start AgriWatch review</button>
          <button disabled={busy || !note.trim()} onClick={() => act('respond')}>Save response</button>
          <button disabled={busy || !note.trim() || Boolean(selected.resolvedAt)} onClick={() => act('resolve')}>Record resolution</button>
        </div>
        <fieldset className="border rounded-lg p-3 space-y-3">
          <legend>Assign for PDMA review</legend>
          <label className="block"><input type="checkbox" checked={serious} onChange={e => setSerious(e.target.checked)} /> I reviewed this as a serious drought situation.</label>
          <label className="block">Verified reviewer for {selected.district}<select className="block border p-2 w-full" value={assignee} onChange={e => setAssignee(e.target.value)}>
            <option value="">Select a verified reviewer</option>
            {reviewers.filter(r => r.district === selected.district).map(r => <option key={r.user_id} value={r.user_id}>{r.user_id}</option>)}
          </select></label>
          <label className="block">Serious drought assessment<textarea className="block border p-2 w-full" value={reason} onChange={e => setReason(e.target.value)} /></label>
          <button disabled={busy || !serious || !selected.reviewStartedAt || !assignee || reason.trim().length < 10 || Boolean(selected.resolvedAt)} onClick={() => act('assign')}>Assign for PDMA review</button>
          <p className="text-xs">Assignment grants this reviewer access within their verified area. It does not confirm a referral to government or a government response.</p>
        </fieldset>
      </div>}
    </Card>}
    {message && <p role="status">{message}</p>}
  </main>;
}
