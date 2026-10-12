import { useEffect, useState } from "react";
import Card from "./Card";
import { districts } from "../data/dummyData";
import { useMyProfile } from "../hooks/useMyProfile";
import { addRipple } from "../utils/ripple";
import { Loader2, Pencil, Check, X } from "lucide-react";

const roleLabel = { farmer: "Farmer", public: "General Public", pdma: "PDMA Officer" };

export default function ProfileCard() {
  const { user, profile, loading, updateProfile } = useMyProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  if (loading) {
    return (
      <Card className="max-w-lg flex items-center justify-center py-10">
        <Loader2 size={18} className="animate-spin text-ink/40" />
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-lg">
        <p className="font-display font-semibold mb-2">Profile</p>
        <p className="text-sm text-ink/50">You're browsing as a guest. Sign in with Google to see your profile here.</p>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="max-w-lg">
        <p className="font-display font-semibold mb-2">Profile</p>
        <p className="text-sm text-ink/50">
          No verification request found for {user.email}. If you just signed up, complete your profile first.
        </p>
      </Card>
    );
  }

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      await updateProfile(form);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err.message || "Couldn't save your changes.");
    } finally {
      setBusy(false);
    }
  }

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const rows = [
    { key: "full_name", label: "Name", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "district", label: "District", type: "select" },
    ...(profile.role === "farmer"
      ? [
          { key: "tehsil", label: "Tehsil", type: "text" },
          { key: "crop", label: "Primary Crop", type: "text" },
          { key: "farm_size", label: "Farm Size", type: "text" },
        ]
      : []),
    ...(profile.role === "pdma" ? [{ key: "designation", label: "Designation", type: "text" }] : []),
  ];

  return (
    <Card className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-display font-semibold">Profile</p>
          <p className="text-xs text-ink/40 mt-0.5">
            {roleLabel[profile.role] || profile.role} ·{" "}
            <span
              className={
                profile.status === "approved" ? "text-primary" : profile.status === "rejected" ? "text-danger" : "text-warn"
              }
            >
              {profile.status}
            </span>
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            onMouseDown={addRipple}
            className="btn-animated flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-1.5 hover:bg-paper-dim"
          >
            <Pencil size={13} /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForm(profile);
                setEditing(false);
                setError("");
              }}
              className="btn-animated flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-1.5 hover:bg-paper-dim"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              onMouseDown={addRipple}
              className="btn-animated flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary-light disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-line pb-2">
          <span className="text-ink/45">Email</span>
          <span className="font-medium">{profile.email}</span>
        </div>
        {rows.map(({ key, label, type }) => (
          <div key={key} className="flex justify-between items-center border-b border-line pb-2 last:border-0 gap-3">
            <span className="text-ink/45 shrink-0">{label}</span>
            {!editing ? (
              <span className="font-medium text-right">{form?.[key] || "—"}</span>
            ) : type === "select" ? (
              <select value={form?.[key] || ""} onChange={(e) => set(key, e.target.value)} className="form-select text-right">
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            ) : (
              <input
                value={form?.[key] || ""}
                onChange={(e) => set(key, e.target.value)}
                className="form-input text-right"
              />
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-danger mt-3">{error}</p>}
    </Card>
  );
}