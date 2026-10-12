import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import Card, { StatusBadge } from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { SkeletonCardList } from "../../components/Skeleton";
import { useComplaints } from "../../store/ComplaintsContext";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import { useToast } from "../../components/ToastContext";
import { addRipple } from "../../utils/ripple";
import { districts } from "../../data/dummyData";
import { Paperclip, Send, X, CheckCircle2, Bug } from "lucide-react";

import { DROUGHT_REPORT_CATEGORIES } from "../../supabase/reportContract";

const MAX_PHOTO_MB = 3;

const CATEGORIES = DROUGHT_REPORT_CATEGORIES;

// General-public version of the farmer complaint form. Writes to the same
// Supabase `complaints` table, tagged reporter_role = "public";
// the AgriWatch admin dashboard receives it alongside farmer reports.
export default function PublicComplaint() {
  const { complaints, loading, offline, error, addComplaint } = useComplaints();
  const profile = useCurrentProfile("public");
  const { showToast } = useToast();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    district: "",
    category: CATEGORIES[0],
    description: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const reporterName = form.name.trim() || profile.name || "Anonymous";
  const district = form.district || profile.district || "";

  const mine = useMemo(
    () =>
      complaints.filter((c) =>
        Boolean(profile.userId) && c.userId === profile.userId
      ),
    [complaints, profile.userId]
  );

  function handleFile(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    setFileError("");
    if (!chosen.type.startsWith("image/")) {
      setFileError("Please attach an image file.");
      return;
    }
    if (chosen.size > MAX_PHOTO_MB * 1024 * 1024) {
      setFileError(`That photo is too large — keep it under ${MAX_PHOTO_MB}MB.`);
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
    if (!form.description.trim() || !district || busy) return;

    setBusy(true);
    try {
      const ref = await addComplaint({
        farmer: reporterName,
        role: "public",
        phone: form.phone.trim() || profile.phone || null,
        district,
        category: form.category,
        description: form.description.trim(),
        photo: file,
        userId: profile.userId,
      });
      setForm({ ...form, description: "" });
      clearFile();
      setSubmittedId(ref);
      showToast(`Report ${ref} recorded for AgriWatch admin review`, "success");
      setTimeout(() => setSubmittedId(null), 5000);
    } catch (err) {
      showToast(err.message || "Couldn't submit that report — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar
        title="Report Drought Situation"
        subtitle="Submit an area or community drought situation for AgriWatch admin review"
      />
      <main className="p-4 sm:p-8 space-y-6 public-page" dir="ltr">
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">Citizen reporting channel</span>
            <h2 className="public-hero-title">Report Drought Situation</h2>
            <p className="public-hero-copy">Report a drought situation affecting your area or community. AgriWatch admins receive every new report first.</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>Your district</span><strong>{district || "Select district"}</strong></div>
            <div className="public-hero-stat"><span>Your reports</span><strong>{mine.length}</strong></div>
            <div className="public-hero-stat"><span>Photo limit</span><strong>{MAX_PHOTO_MB} MB</strong></div>
          </div>
        </section>

        {offline && <OfflineNotice what="reports" error={error} />}

        {submittedId && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-lg px-4 py-3">
            <CheckCircle2 size={16} />
            Report {submittedId} recorded for AgriWatch admin review.
          </div>
        )}

        <Card className="public-form-card">
          <p className="font-display font-semibold mb-1">New report</p>
          <p className="text-xs text-ink/45 mb-4">
            Reports first go to AgriWatch admins for review and response. Found a bug in the website
            instead?{" "}
            <Link to="/public/report-issue" className="text-primary hover:underline inline-flex items-center gap-1">
              <Bug size={12} /> Report a software issue
            </Link>
            .
          </p>

          <p className="mb-4 text-sm">For routine farming questions, use crop advice in the farmer portal; this form is for drought situations.</p>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!profile.name && (
                <label className="block">
                  <span className="text-xs uppercase text-ink/40 font-medium">Your name</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Optional"
                    className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">Phone (optional)</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+92 3XX XXXXXXX"
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">District</span>
                <select
                  value={district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                >
                  <option value="">Select a district…</option>
                  {districts.map((d) => (
                    <option key={d.id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase text-ink/40 font-medium">Drought report category</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs uppercase text-ink/40 font-medium">What's happening?</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Describe the situation in your village / union council…"
                className="mt-1 border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
              />
            </label>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" id="public-complaint-photo" />

            {preview ? (
              <div className="flex items-center gap-3 border border-line rounded-lg p-2 w-fit">
                <img src={preview} alt="Attached" className="w-16 h-16 rounded-md object-cover" />
                <div className="pr-2">
                  <p className="text-xs font-medium max-w-[10rem] truncate">{file?.name}</p>
                  <button type="button" onClick={clearFile} className="flex items-center gap-1 text-xs text-danger hover:underline mt-1">
                    <X size={12} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="public-complaint-photo"
                className="btn-animated inline-flex items-center gap-2 text-xs text-ink/50 border border-line rounded-lg px-3 py-2 hover:bg-paper-dim cursor-pointer w-fit"
              >
                <Paperclip size={14} /> Attach photo
              </label>
            )}
            {fileError && <p className="text-xs text-danger">{fileError}</p>}

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={busy}
                onMouseDown={addRipple}
                className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                <Send size={14} /> {busy ? "Sending..." : "Submit report"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="public-section-title mb-4"><div><h2>Your reports</h2><p>Track recorded updates from AgriWatch admins.</p></div></div>
          {loading ? (
            <SkeletonCardList count={2} />
          ) : mine.length === 0 ? (
            <p className="text-sm text-ink/45">You haven't submitted any reports yet.</p>
          ) : (
            <div className="space-y-3">
              {mine.map((c) => (
                <div key={c.id} className="public-list-row flex items-start gap-3">
                  {c.photo && <img src={c.photo} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{c.category}</p>
                      <StatusBadge status={c.displayStatus} />
                    </div>
                    <p className="text-xs text-ink/40 font-mono mt-0.5">
                      {c.id} · {c.date} · {c.district}
                    </p>
                    {c.description && <p className="text-xs text-ink/55 mt-1">{c.description}</p>}
                    {c.pdmaResponseNote && <p className="text-xs text-primary mt-2 bg-primary/5 rounded-lg px-3 py-2"><span className="font-semibold">PDMA response: </span>{c.pdmaResponseNote}</p>}
                    {c.resolutionNote && (
                      <p className="text-xs text-primary mt-2 bg-primary/5 rounded-md px-2 py-1.5">
                        <span className="font-medium">{c.respondedAt ? "AgriWatch admin response: " : "Recorded response: "}</span>
                        {c.resolutionNote}
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
