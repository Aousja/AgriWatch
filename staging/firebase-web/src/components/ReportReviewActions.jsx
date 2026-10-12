import { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { useComplaints } from '../store/ComplaintsContext';
import { useSupabaseAuth } from '../supabase/useSupabaseAuth';
import { fetchReportReviewers } from '../supabase/complaintsApi';
import { isPermittedAssignment } from '../supabase/reportContract';

export default function ReportReviewActions({ report, note, pdma = false, onUpdated }) {
  const { access, reviewReport } = useComplaints();
  const { user } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewers, setReviewers] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [reason, setReason] = useState('');
  const [serious, setSerious] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const allowed = pdma
    ? isPermittedAssignment(report, user?.id, access?.districts || [])
    : Boolean(access?.admin);
  useEffect(() => {
    let cancelled = false;
    if (!pdma && access?.admin) fetchReportReviewers()
      .then(rows => { if (!cancelled) setReviewers(rows); })
      .catch(() => { if (!cancelled) setMessage('Verified reviewers could not be loaded. Refresh and try again.'); });
    return () => { cancelled = true; };
  }, [pdma, access?.admin]);

  async function act(action) {
    setBusy(true); setMessage('');
    try {
      const updated = await reviewReport(report.dbId, action, note, assignee, reason);
      onUpdated(updated);
      setMessage(action === 'resolve' ? 'Resolution recorded.' : 'Report updated.');
    } catch (error) { setMessage(error.message || 'Report update failed.'); }
    finally { setBusy(false); setConfirmResolve(false); }
  }
  const currentReview = pdma
    ? report.pdmaReviewStartedBy === user?.id && report.pdmaReviewStartedAt >= report.assignedAt
    : Boolean(report.reviewStartedAt);
  const closed = report.status === 'Resolved' || Boolean(report.resolvedAt);
  const buttonClass = 'btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50';
  return <div className="space-y-3">
    {report.resolutionNote && <p className="text-sm text-ink/70">AgriWatch response: {report.resolutionNote}</p>}
    {report.pdmaResponseNote && <p className="text-sm text-ink/70">PDMA response: {report.pdmaResponseNote}</p>}
    {report.assignedAt && <p className="text-xs text-ink/50">Assigned for PDMA review: {report.assignedAt}</p>}
    {report.resolvedAt && <p className="text-xs text-ink/50">Resolution recorded: {report.resolvedAt}</p>}
    {allowed && <div className="flex flex-wrap gap-2 pt-1">
      <button className={buttonClass} disabled={busy || closed || currentReview} onClick={() => act('start_review')}>{pdma ? 'Start PDMA review' : 'Start AgriWatch review'}</button>
      <button className={buttonClass} disabled={busy || closed || !currentReview || !note.trim()} onClick={() => act('respond')}>Save response</button>
      <button className={`${buttonClass} bg-primary text-white`} disabled={busy || closed || !currentReview || !note.trim()} onClick={() => setConfirmResolve(true)}>Mark resolved</button>
    </div>}
    {allowed && !pdma && !closed && <fieldset className="border border-line rounded-lg p-3 space-y-3">
      <legend className="text-xs font-medium">Assign for PDMA review</legend>
      <label className="block text-xs"><input type="checkbox" checked={serious} onChange={e => setSerious(e.target.checked)} /> Reviewed as a serious drought situation</label>
      <label className="block text-xs">Verified reviewer for {report.district}<select className="block border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full mt-1" value={assignee} onChange={e => setAssignee(e.target.value)}>
        <option value="">Select a verified reviewer</option>
        {reviewers.filter(r => r.district === report.district).map(r => <option key={r.user_id} value={r.user_id}>{r.user_id}</option>)}
      </select></label>
      <label className="block text-xs">Serious drought assessment<textarea className="block border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full mt-1" maxLength={5000} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button className={buttonClass} disabled={busy || !currentReview || !serious || !assignee || reason.trim().length < 10} onClick={() => act('assign')}>Assign for PDMA review</button>
      <p className="text-xs text-ink/50">Assignment does not confirm government action. Only an admin may assign or reassign.</p>
    </fieldset>}
    {!allowed && <p role="alert" className="text-sm text-danger">You are not authorized to review this report.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <ConfirmDialog open={confirmResolve} title="Mark this report resolved?" body="The farmer will see the resolution and your response." confirmLabel="Mark resolved" tone="primary" onConfirm={() => act('resolve')} onCancel={() => setConfirmResolve(false)} />
  </div>;
}
