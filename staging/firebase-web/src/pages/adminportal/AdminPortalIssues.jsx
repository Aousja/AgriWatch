import { useMemo, useState } from "react";
import Card from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import ConfirmDialog from "../../components/ConfirmDialog";
import { SkeletonCardList } from "../../components/Skeleton";
import { useIssueReports } from "../../store/IssueReportsContext";
import { useSupabaseAuth } from "../../supabase/useSupabaseAuth";
import { useToast } from "../../components/ToastContext";
import { addRipple } from "../../utils/ripple";
import { ISSUE_STATUS, ISSUES_TABLE } from "../../supabase/complaintsApi";
import { IssueStatusBadge, SeverityPill } from "../shared/ReportIssue";
import { Bug, Sprout, Users2, ShieldCheck, X, CheckCircle2, Monitor } from "lucide-react";

const roleIcon = { farmer: Sprout, public: Users2, pdma: ShieldCheck, admin: ShieldCheck };
const roleLabel = { farmer: "Farmer", public: "General Public", pdma: "PDMA Officer" };

// Super-admin triage screen for "the software is broken" reports coming from
// every portal. Reads and writes public.issue_reports in Supabase.
export default function AdminPortalIssues() {
  const { issues, loading, offline, error, updateIssue } = useIssueReports();
  const { user } = useSupabaseAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState("Open");
  const [roleFilter, setRoleFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(null);

  const counts = useMemo(
    () =>
      ISSUE_STATUS.reduce((acc, s) => {
        acc[s] = issues.filter((i) => i.status === s).length;
        return acc;
      }, {}),
    [issues]
  );

  const critical = issues.filter((i) => i.severity === "Critical" && i.status !== "Resolved" && i.status !== "Closed").length;

  const filtered = issues.filter(
    (i) =>
      (statusFilter === "all" || i.status === statusFilter) &&
      (roleFilter === "all" || i.role === roleFilter)
  );

  function openIssue(i) {
    setOpen(i);
    setNote(i.adminNote || "");
  }

  function close() {
    setOpen(null);
    setNote("");
  }

  async function setStatus(issue, status) {
    setBusy(true);
    try {
      await updateIssue(issue.id, { status, adminNote: note, handledBy: user?.email || "" });
      setOpen((prev) => (prev && prev.id === issue.id ? { ...prev, status, adminNote: note } : prev));
      showToast(`${issue.id} marked ${status}`, status === "Resolved" ? "success" : "info");
    } catch (err) {
      showToast(err.message || "Couldn't update that issue.", "error");
    } finally {
      setBusy(false);
      setConfirmResolve(null);
    }
  }

  return (
    <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Software issue reports</h1>
        <p className="text-sm text-ink/50 mt-1">
          Glitches reported by farmers, public users and PDMA officers from inside the app. Your reply
          is shown back to whoever reported it.
        </p>
      </div>

      {offline && <OfflineNotice what="issue reports" error={error} />}

      {critical > 0 && (
        <Card className="border-danger/30 bg-danger/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-danger/15 flex items-center justify-center shrink-0">
            <Bug size={16} className="text-danger" />
          </div>
          <p className="text-sm">
            <span className="font-semibold">{critical}</span> critical issue{critical === 1 ? "" : "s"} still
            unresolved.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ISSUE_STATUS.map((s) => (
          <Card key={s}>
            <p className="text-xs uppercase text-ink/40 font-medium">{s}</p>
            <p className="font-display text-2xl font-semibold mt-1">{counts[s] || 0}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["all", ...ISSUE_STATUS].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            onMouseDown={addRipple}
            className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s ? "bg-forest text-white border-forest" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
        <span className="w-px h-5 bg-line mx-1" />
        {["all", "farmer", "public", "pdma"].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            onMouseDown={addRipple}
            className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              roleFilter === r ? "bg-primary text-white border-primary" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
            }`}
          >
            {r === "all" ? "Everyone" : roleLabel[r]}
          </button>
        ))}
        <span className="text-xs text-ink/35 font-mono ms-auto">{ISSUES_TABLE}</span>
      </div>

      {loading ? (
        <SkeletonCardList count={3} />
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/50">No issues match this filter.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => {
            const Icon = roleIcon[i.role] || Bug;
            return (
              <Card key={i.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">{i.title}</p>
                    <IssueStatusBadge status={i.status} />
                  </div>
                  <p className="text-xs text-ink/50 mt-1">
                    {[roleLabel[i.role] || i.role, i.reporter, i.district].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-[11px] text-ink/35 font-mono mt-0.5">
                    {i.id} · {i.date} · {i.area}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <SeverityPill level={i.severity} />
                    {i.screenshot && (
                      <span className="text-[11px] text-ink/40 flex items-center gap-1">
                        <Monitor size={11} /> screenshot attached
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/55 mt-2 line-clamp-2">{i.description}</p>
                  <button
                    onClick={() => openIssue(i)}
                    onMouseDown={addRipple}
                    className="btn-animated mt-3 text-xs font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5"
                  >
                    Open & respond
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
              <div className="min-w-0">
                <p className="font-display font-semibold">{open.title}</p>
                <p className="text-xs text-ink/40 font-mono">
                  {open.id} · {open.date}
                </p>
              </div>
              <button onClick={close} aria-label="Close" className="text-ink/40 hover:text-ink shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-0.5">Reported by</p>
                  <p className="font-medium">{open.reporter}</p>
                  <p className="text-xs text-ink/50">{roleLabel[open.role] || open.role}</p>
                  {open.email && <p className="text-xs text-ink/45 truncate">{open.email}</p>}
                </div>
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-0.5">Area</p>
                  <p className="font-medium">{open.area}</p>
                  <div className="mt-1">
                    <SeverityPill level={open.severity} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1">What happened</p>
                <p className="text-sm text-ink/70 whitespace-pre-wrap">{open.description}</p>
              </div>

              {open.screenshot && (
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-1">Screenshot</p>
                  <img src={open.screenshot} alt="Reported problem" className="w-full rounded-lg border border-line" />
                </div>
              )}

              {(open.pageUrl || open.userAgent) && (
                <div className="bg-paper-dim rounded-lg p-3 space-y-1">
                  <p className="text-xs uppercase text-ink/40 font-medium">Technical details</p>
                  {open.pageUrl && <p className="text-[11px] font-mono text-ink/55 break-all">{open.pageUrl}</p>}
                  {open.userAgent && <p className="text-[11px] font-mono text-ink/45 break-all">{open.userAgent}</p>}
                </div>
              )}

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1.5">Reply to the reporter</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Fixed in the 12 Sep update — please refresh the page."
                  className="border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  disabled={busy}
                  onClick={() => setStatus(open, "In Progress")}
                  onMouseDown={addRipple}
                  className="btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50"
                >
                  In Progress
                </button>
                <button
                  disabled={busy}
                  onClick={() => setStatus(open, "Closed")}
                  onMouseDown={addRipple}
                  className="btn-animated text-xs font-medium border border-line rounded-lg px-3 py-2 hover:bg-paper-dim disabled:opacity-50"
                >
                  Close without fix
                </button>
                <button
                  disabled={busy}
                  onClick={() => setConfirmResolve(open)}
                  onMouseDown={addRipple}
                  className="btn-animated flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-2 hover:bg-primary-light disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> {busy ? "Saving..." : "Mark Resolved"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmResolve}
        title="Mark this issue resolved?"
        body="Your reply is written back to Supabase and shown to the person who reported it."
        confirmLabel="Mark resolved"
        tone="primary"
        onConfirm={() => confirmResolve && setStatus(confirmResolve, "Resolved")}
        onCancel={() => setConfirmResolve(null)}
      />
    </main>
  );
}
