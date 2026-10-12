import { useEffect, useState } from "react";
import { Pencil, Loader2, Check, X } from "lucide-react";
import Card from "./Card";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrentProfile } from "../supabase/useCurrentProfile";
import { useToast } from "./ToastContext";

// Which fields each portal's profile shows/edits, in display order.
const FIELDS_BY_ROLE = {
  farmer: ["name", "phone", "district", "tehsil", "crop", "farmSize"],
  pdma: ["name", "phone", "district"],
  public: ["name", "phone", "district"],
};

export default function ProfileEditor({ role, className = "" }) {
  const { t } = useLanguage();
  const widthClass = /(^|\s)max-w-/.test(className) ? "" : "max-w-lg";
  const profile = useCurrentProfile(role);
  const { showToast } = useToast();
  const fields = FIELDS_BY_ROLE[role] || FIELDS_BY_ROLE.public;

  const fieldMeta = {
    name: { label: t("fullName") },
    phone: { label: t("phoneNumber"), dir: "ltr" },
    district: { label: t("district") },
    tehsil: { label: t("tehsil") },
    crop: { label: t("primaryCrop") },
    farmSize: { label: t("farmSizeLabel") },
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Keep the form in sync with the live profile whenever we're NOT mid-edit
  // (e.g. after the initial Supabase fetch resolves).
  useEffect(() => {
    if (editing) return;
    setForm(Object.fromEntries(fields.map((f) => [f, profile[f] || ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, role, profile.name, profile.phone, profile.district, profile.tehsil, profile.crop, profile.farmSize]);

  function startEdit() {
    setForm(Object.fromEntries(fields.map((f) => [f, profile[f] || ""])));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await profile.updateProfile(form);
    setSaving(false);
    if (error) {
      showToast(t("profileUpdateFailed"), "error");
      return;
    }
    setEditing(false);
    showToast(t("profileUpdated"), "success");
  }

  if (profile.loading) {
    return (
      <Card className={`${widthClass} ${className}`}>
        <div className="flex items-center gap-2 text-sm text-ink/50">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${widthClass} ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <p className="font-display font-semibold">{t("yourProfile")}</p>
          <p className="text-xs text-ink/45 mt-0.5">{t("profileCardSub")}</p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="btn-animated shrink-0 flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-1.5 bg-surface hover:bg-paper-dim transition-colors"
          >
            <Pencil size={13} /> {t("editProfile")}
          </button>
        )}
      </div>

      {!profile.signedIn && (
        <p className="text-xs text-ink/45 bg-paper-dim rounded-lg px-3 py-2 mb-4">{t("demoProfileNote")}</p>
      )}

      {editing ? (
        <form onSubmit={save} className="space-y-3">
          {fields.map((f) => (
            <div key={f}>
              <label className="text-xs font-medium text-ink/50 uppercase tracking-wide">{fieldMeta[f].label}</label>
              <input
                value={form[f] || ""}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                dir={fieldMeta[f].dir}
                className="form-input mt-1"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="btn-animated flex items-center gap-1.5 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {t("saveChanges")}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-medium text-ink/50 hover:text-ink px-3 py-2"
            >
              <X size={14} /> {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 text-sm">
          {fields.map((f, i) => (
            <div
              key={f}
              className={`flex justify-between gap-4 pb-2 ${i < fields.length - 1 ? "border-b border-line" : ""}`}
            >
              <span className="text-ink/45 shrink-0">{fieldMeta[f].label}</span>
              <span className="font-medium text-right" dir={fieldMeta[f].dir}>
                {profile[f] || t("notSet")}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
