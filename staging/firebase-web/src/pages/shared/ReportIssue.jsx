import { useMemo, useRef, useState } from "react";
import Topbar from "../../components/Topbar";
import Card from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { SkeletonCardList } from "../../components/Skeleton";
import { useIssueReports } from "../../store/IssueReportsContext";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import { useToast } from "../../components/ToastContext";
import { addRipple } from "../../utils/ripple";
import { ISSUE_AREAS, ISSUE_SEVERITY } from "../../supabase/complaintsApi";
import { Bug, Paperclip, Send, X, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const MAX_MB = 3;

const severityStyle = {
  Low: "bg-line text-ink/60",
  Medium: "bg-warn/10 text-warn",
  High: "bg-danger/10 text-danger",
  Critical: "bg-[#7A1F13]/10 text-[#7A1F13]",
};

const statusStyle = {
  Open: "bg-warn/10 text-warn",
  "In Progress": "bg-info/10 text-info",
  Resolved: "bg-primary/10 text-primary",
  Closed: "bg-line text-ink/60",
};

export function IssueStatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[status] || "bg-line text-ink/60"}`}>
      {status}
    </span>
  );
}

export function SeverityPill({ level }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${severityStyle[level] || "bg-line text-ink/60"}`}>
      {level}
    </span>
  );
}

// One page, three portals. `role` decides the copy and who the report is
// tagged as coming from: "farmer" | "public" | "pdma".
export default function ReportIssue({ role = "farmer" }) {
  const { issues, loading, offline, error, addIssue } = useIssueReports();
  const profile = useCurrentProfile(role === "pdma" ? "pdma" : role);
  const { showToast } = useToast();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    area: ISSUE_AREAS[0],
    severity: "Medium",
    title: "",
    description: "",
    name: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const reporterName = form.name.trim() || profile.name || "Anonymous";

  // "My reports" — matched by account where we have one, otherwise by name.
  const mine = useMemo(
    () =>
      issues.filter((i) =>
        profile.userId ? i.userId === profile.userId : i.reporter === reporterName
      ),
    [issues, profile.userId, reporterName]
  );

  function handleFile(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    setFileError("");
    if (!chosen.type.startsWith("image/")) {
      setFileError("Please attach an image (a screenshot of the problem).");
      return;
    }
    if (chosen.size > MAX_MB * 1024 * 1024) {
      setFileError(`That image is too large — keep it under ${MAX_MB}MB.`);
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || busy) return;

    setBusy(true);
    try {
      const ref = await addIssue({
        reporterName,
        reporterEmail: profile.email || null,
        role,
        district: profile.district || null,
        area: form.area,
        severity: form.severity,
        title: form.title.trim(),
        description: form.description.trim(),
        screenshot: file,
        userId: profile.userId,
      });
      setForm({ ...form, title: "", description: "" });
      clearFile();
      setSubmittedId(ref);
      showToast(`Issue ${ref} sent to the AgriWatch admin team`, "success");
      setTimeout(() => setSubmittedId(null), 5000);
    } catch (err) {
      showToast(err.message || "Couldn't submit that report — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    role === "pdma"
      ? "Report a glitch or data problem in AgriWatch — goes straight to the system admin"
      : "Something not working? Tell the AgriWatch admin team about it";

  return (
    <>
      <Topbar title="Report a Software Issue" subtitle={subtitle} />
      <main className={`${role === "pdma" ? "pdma-page" : "farmer-page"} p-4 sm:p-8 space-y-6`} dir="ltr">
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> AgriWatch support channel</span>
                <h2 className="farmer-hero-title">Report a software or data problem</h2>
                <p className="farmer-hero-copy">Send a clear description and optional screenshot directly to the AgriWatch admin team so the issue can be tracked and resolved.</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"><Bug size={22} /></div>
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Reporter</span><strong>{reporterName || "User"}</strong></div>
              <div className="farmer-hero-stat"><span>Portal</span><strong>{role === "pdma" ? "PDMA" : role === "public" ? "Public" : "Farmer"}</strong></div>
              <div className="farmer-hero-stat"><span>Your reports</span><strong>{mine.length}</strong></div>
            </div>
          </div>
        </section>

        {offline && <OfflineNotice what="issue reports" error={error} />}

        {submittedId && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-lg px-4 py-3">
            <CheckCircle2 size={16} />
            Issue {submittedId} submitted — the admin team can see it in the Admin Portal now.
          </div>
        )}

        <Card className="farmer-form-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
              <Bug size={15} className="text-danger" />
            </div>
            <p className="font-display font-semibold">Describe the problem</p>
          </div>
          <p className="text-xs text-ink/45 mb-4">
            Bugs, wrong numbers, pages that won't load, buttons that do nothing — all of it helps.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">Where in the app?</span>
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                >
                  {ISSUE_AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">How bad is it?</span>
                <select
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                >
                  {ISSUE_SEVERITY.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            {!profile.name && (
              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">Your name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="So the admin can get back to you"
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs uppercase text-ink/40 font-medium">Short title</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Drought map won't load on mobile"
                className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase text-ink/40 font-medium">What happened?</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="What were you doing, what did you expect, and what happened instead?"
                className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
              />
            </label>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" id="issue-screenshot" />

            {preview ? (
              <div className="flex items-center gap-3 border border-line rounded-lg p-2 w-fit">
                <img src={preview} alt="Screenshot" className="w-16 h-16 rounded-md object-cover" />
                <div className="pr-2">
                  <p className="text-xs font-medium max-w-[10rem] truncate">{file?.name}</p>
                  <button type="button" onClick={clearFile} className="flex items-center gap-1 text-xs text-danger hover:underline mt-1">
                    <X size={12} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="issue-screenshot"
                className="btn-animated inline-flex items-center gap-2 text-xs text-ink/50 border border-line rounded-lg px-3 py-2 hover:bg-paper-dim cursor-pointer w-fit"
              >
                <Paperclip size={14} /> Attach a screenshot
              </label>
            )}
            {fileError && <p className="text-xs text-danger">{fileError}</p>}

            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
              <p className="text-[11px] text-ink/40">
                Filed as <span className="font-medium text-ink/60">{reporterName}</span>
                {profile.email ? ` · ${profile.email}` : ""} · {role === "pdma" ? "PDMA Officer" : role === "public" ? "General Public" : "Farmer"}
              </p>
              <button
                type="submit"
                disabled={busy}
                onMouseDown={addRipple}
                className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                <Send size={14} /> {busy ? "Sending..." : "Send to admin"}
              </button>
            </div>
          </form>
        </Card>

        <Card className="farmer-form-card">
          <p className="font-display font-semibold mb-4">Issues you've reported</p>
          {loading ? (
            <SkeletonCardList count={2} />
          ) : mine.length === 0 ? (
            <p className="text-sm text-ink/45">Nothing reported yet.</p>
          ) : (
            <div className="space-y-3">
              {mine.map((i) => (
                <div key={i.id} className="farmer-list-row flex items-start gap-3">
                  {i.screenshot && <img src={i.screenshot} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{i.title}</p>
                      <IssueStatusBadge status={i.status} />
                    </div>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">
                      {i.id} · {i.date} · {i.area}
                    </p>
                    <div className="mt-1.5">
                      <SeverityPill level={i.severity} />
                    </div>
                    {i.description && <p className="text-xs text-ink/55 mt-1.5">{i.description}</p>}
                    {i.adminNote && (
                      <p className="text-xs text-primary mt-2 bg-primary/5 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                        <ShieldCheck size={12} className="mt-0.5 shrink-0" />
                        <span>
                          <span className="font-medium">Admin response: </span>
                          {i.adminNote}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
