import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { DROUGHT_REPORT_CATEGORIES } from "../../supabase/reportContract";
import Card, { StatusBadge } from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { SkeletonCardList } from "../../components/Skeleton";
import { useComplaints } from "../../store/ComplaintsContext";
import { useCurrentProfile } from "../../supabase/useCurrentProfile";
import {
  Paperclip,
  Send,
  X,
  CheckCircle2,
  Bug,
  FileWarning,
  ShieldCheck,
  Camera,
  MapPin,
  Sparkles,
} from "lucide-react";
import { addRipple } from "../../utils/ripple";
import { useToast } from "../../components/ToastContext";

const MAX_PHOTO_MB = 3;

export default function FarmerComplaints() {

  const { complaints, loading, offline, error, addComplaint } = useComplaints();
  const profile = useCurrentProfile("farmer");
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ category: DROUGHT_REPORT_CATEGORIES[0], description: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [busy, setBusy] = useState(false);
  const [justSubmittedId, setJustSubmittedId] = useState(null);

  const mine = useMemo(
    () => complaints.filter((c) => Boolean(profile.userId) && c.userId === profile.userId),
    [complaints, profile.userId]
  );

  const openCount = mine.filter((c) => c.status !== "Resolved").length;
  const resolvedCount = mine.filter((c) => c.status === "Resolved").length;

  function handleFileChange(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    setPhotoError("");

    if (!chosen.type.startsWith("image/")) {
      setPhotoError("Please attach an image file.");
      return;
    }
    if (chosen.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Image is too large — please use a photo under ${MAX_PHOTO_MB}MB.`);
      return;
    }

    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  function removePhoto() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.description.trim() || busy) return;

    setBusy(true);
    try {
      const id = await addComplaint({
        farmer: profile.name,
        role: "farmer",
        phone: profile.phone || null,
        district: profile.district,
        category: form.category,
        description: form.description.trim(),
        photo: file,
        userId: profile.userId,
      });

      setForm({ ...form, description: "" });
      removePhoto();
      setJustSubmittedId(id);
      showToast(`Report ${id} recorded for AgriWatch admin review`, "success");
      setTimeout(() => setJustSubmittedId(null), 5000);
    } catch (err) {
      showToast(err.message || "Couldn't submit that report — please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar title="Report Drought Situation" subtitle="Submit an area or community drought situation for AgriWatch admin review" />
      <main className="farmer-page p-4 sm:p-8 space-y-6" dir="ltr">
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> AgriWatch drought reporting</span>
                <h2 className="farmer-hero-title">Report Drought Situation</h2>
                <p className="farmer-hero-copy">Report a drought situation affecting your area or community. AgriWatch admins receive every new report first.</p>
              </div>
              <span className="farmer-hero-button"><MapPin size={14} /> {profile.district || "District not set"}</span>
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Total drought reports</span><strong>{mine.length}</strong></div>
              <div className="farmer-hero-stat"><span>Open cases</span><strong>{openCount}</strong></div>
              <div className="farmer-hero-stat"><span>Resolved</span><strong>{resolvedCount}</strong></div>
            </div>
          </div>
        </section>

        {offline && <OfflineNotice what="drought reports" error={error} />}

        {justSubmittedId && (
          <div className="farmer-callout flex items-center gap-2 text-primary text-sm font-medium">
            <CheckCircle2 size={17} />
            Report {justSubmittedId} recorded for AgriWatch admin review.
          </div>
        )}

        <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-6 items-start">
          <Card className="farmer-form-card">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><FileWarning size={18} className="text-primary" /></div>
              <div>
                <p className="font-display font-semibold">Create a drought situation report</p>
                <p className="text-xs text-ink/45 mt-1">This report goes first to the AgriWatch admin dashboard.</p>
              </div>
            </div>

            <p className="mb-4 text-sm">Routine farming question? <Link className="text-primary underline" to="/farmer/crops">Use crop advice</Link> rather than submit a drought report.</p>
            <form onSubmit={submit} className="space-y-4 farmer-form-card">
              <label className="block">
                <span className="farmer-card-label">Drought report category</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1.5 border border-line rounded-xl px-3 py-2.5 text-sm bg-surface w-full"
                >
                  {DROUGHT_REPORT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="farmer-card-label">Describe the drought situation</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe where the drought situation is happening, how long it has lasted, and the affected area or community..."
                  rows={5}
                  className="mt-1.5 border border-line rounded-xl px-3 py-3 text-sm bg-surface w-full resize-y"
                />
              </label>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="complaint-photo-input" />

              {preview ? (
                <div className="farmer-field-panel flex items-center gap-3">
                  <img src={preview} alt="Attached" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{file?.name}</p>
                    <p className="text-[11px] text-ink/40 mt-1">Photo evidence ready to upload</p>
                    <button type="button" onClick={removePhoto} className="flex items-center gap-1 text-xs text-danger hover:underline mt-2"><X size={12} /> Remove photo</button>
                  </div>
                </div>
              ) : (
                <label htmlFor="complaint-photo-input" className="farmer-field-panel cursor-pointer flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Camera size={18} /></div>
                  <div><p className="text-sm font-semibold">Attach photo evidence</p><p className="text-xs text-ink/45 mt-0.5">Optional image, maximum {MAX_PHOTO_MB}MB</p></div>
                  <Paperclip size={16} className="ms-auto text-ink/35" />
                </label>
              )}
              {photoError && <p className="text-xs text-danger">{photoError}</p>}

              <button
                type="submit"
                disabled={busy || !form.description.trim()}
                onMouseDown={addRipple}
                className="btn-animated auth-primary-btn"
              >
                <Send size={15} /> {busy ? "Submitting..." : "Submit report"}
              </button>
            </form>

            <p className="text-xs text-ink/45 mt-4 text-center">
              Is the app itself broken? <Link to="/farmer/report-issue" className="text-primary font-semibold hover:underline inline-flex items-center gap-1"><Bug size={12} /> Report a software issue</Link>
            </p>
          </Card>

          <Card className="farmer-form-card">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-display font-semibold">How drought reporting works</p>
                <p className="text-xs text-ink/45 mt-1">Your report stays linked to your farmer account.</p>
              </div>
              <ShieldCheck size={19} className="text-primary" />
            </div>
            <div className="farmer-advice-list">
              {["Submit a drought situation report and optional evidence.", "AgriWatch admins review and respond first. Serious drought reports may be explicitly assigned for PDMA review.", "Track recorded actions here. Assignment does not confirm government action."].map((item, index) => (
                <div key={item} className="farmer-advice-item"><span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">0{index + 1}</span><span>{item}</span></div>
              ))}
            </div>
          </Card>
        </div>

        <section>
          <div className="farmer-section-title mb-3">
            <div><h2>Your drought reports</h2><p>Review recorded updates and AgriWatch admin responses.</p></div>
          </div>
          <Card className="farmer-form-card">
            {loading ? (
              <SkeletonCardList count={2} />
            ) : mine.length === 0 ? (
              <div className="farmer-empty-state"><FileWarning size={22} className="text-primary mx-auto" /><p className="font-display font-semibold mt-3">No drought reports yet</p><p className="text-sm text-ink/45 mt-1">Your submitted reports will appear here.</p></div>
            ) : (
              <div className="space-y-3">
                {mine.map((c) => (
                  <div key={c.id} className="farmer-list-row flex items-start gap-3">
                    {c.photo && <img src={c.photo} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap"><p className="text-sm font-semibold">{c.category}</p><StatusBadge status={c.displayStatus} /></div>
                      <p className="text-[11px] text-ink/40 font-mono mt-1">{c.id} · {c.date}</p>
                      {c.description && <p className="text-sm text-ink/55 mt-2 leading-relaxed">{c.description}</p>}
                    {c.pdmaResponseNote && <p className="text-xs text-primary mt-2 bg-primary/5 rounded-lg px-3 py-2"><span className="font-semibold">PDMA response: </span>{c.pdmaResponseNote}</p>}
                      {c.resolutionNote && <p className="text-xs text-primary mt-2 bg-primary/5 rounded-lg px-3 py-2"><span className="font-semibold">{c.respondedAt ? "AgriWatch admin response: " : "Recorded response: "}</span>{c.resolutionNote}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </>
  );
}
