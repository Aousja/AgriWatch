import { useEffect } from "react";
import { X, Check, Braces, Clock } from "lucide-react";
import { addRipple } from "../utils/ripple";

// ---- Field presentation helpers ----

const FIELD_LABELS = {
  employeeId: "Employee ID",
  uid: "User ID",
  cnic: "CNIC",
  department: "Department",
  designation: "Designation",
  officialEmail: "Official Email",
  organizationName: "Organization",
  province: "Province",
  phone: "Phone",
  phoneNumber: "Phone",
  mobile: "Phone",
  district: "District",
  assignedDistrict: "District",
  tehsil: "Tehsil",
  reason: "Reason for Request",
  requestedRole: "Requested Role",
  crop: "Crop",
  primaryCrop: "Crop",
  farmSize: "Farm Size",
  fullName: "Full Name",
  farmerName: "Full Name",
  userName: "Full Name",
  name: "Full Name",
  email: "Email",
  address: "Address",
  location: "Location",
};

// Fields grouped into sections for the modal. Anything present on the
// item but not listed here falls into "Other details" automatically, so
// new fields the mobile app adds later still show up somewhere sensible.
const SECTIONS = [
  { title: "Applicant", keys: ["fullName", "name", "farmerName", "userName", "email", "phone", "phoneNumber", "mobile", "cnic"] },
  { title: "Location", keys: ["province", "district", "assignedDistrict", "tehsil", "location", "address"] },
  { title: "Role details", keys: ["requestedRole", "designation", "department", "employeeId", "officialEmail", "organizationName"] },
  { title: "Farm details", keys: ["crop", "primaryCrop", "farmSize"] },
  { title: "Request", keys: ["reason"] },
];

const HIDDEN_KEYS = new Set(["id", "status", "submittedAt", "createdAt", "timestamp", "date", "role", "userType", "type"]);

function fieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatFieldValue(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") {
    if (typeof v.toDate === "function") return v.toDate().toLocaleString();
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toLocaleString();
    if (Array.isArray(v)) return v.length ? v.join(", ") : null;
    return JSON.stringify(v);
  }
  return String(v);
}

function formatDate(value) {
  if (!value) return null;
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return null;
}

// ---- Modal ----

export default function RequestDetailModal({
  item,
  open,
  onClose,
  onApprove,
  onReject,
  busy,
  statusValues = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" },
  roleIcon: RoleIconMap = {},
  roleLabelOverride,
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const name = pick(item, "fullName", "name", "farmerName", "userName") || "Unnamed applicant";
  const role = (pick(item, "role", "userType", "type") || pick(item, "requestedRole") || "unknown").toLowerCase();
  const roleLabel = roleLabelOverride || role;
  const status = (pick(item, "status") || statusValues.PENDING).toLowerCase();
  const createdAt = pick(item, "createdAt", "date", "timestamp", "submittedAt");
  const RoleIcon = RoleIconMap[role] || Clock;
  const isPending = status === statusValues.PENDING;

  const usedKeys = new Set(SECTIONS.flatMap((s) => s.keys));
  const sectionsWithData = SECTIONS
    .map((s) => ({
      title: s.title,
      fields: s.keys
        .map((k) => [k, formatFieldValue(item[k])])
        .filter(([, v]) => v !== null),
    }))
    .filter((s) => s.fields.length > 0);

  const otherFields = Object.entries(item)
    .filter(([k]) => !HIDDEN_KEYS.has(k) && !usedKeys.has(k))
    .map(([k, v]) => [k, formatFieldValue(v)])
    .filter(([, v]) => v !== null);

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-detail-title"
    >
      <div
        className="bg-surface rounded-xl max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-line shrink-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <RoleIcon size={18} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p id="request-detail-title" className="font-display font-semibold truncate">{name}</p>
            <p className="text-xs text-ink/45 capitalize mt-0.5">{roleLabel}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${
            status === statusValues.APPROVED ? "bg-primary/10 text-primary"
            : status === statusValues.REJECTED ? "bg-danger/10 text-danger"
            : "bg-warn/10 text-warn"
          }`}>
            {status}
          </span>
          <button onClick={onClose} className="text-ink/40 hover:text-ink shrink-0 p-1 -m-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {createdAt && (
            <p className="text-xs text-ink/40 flex items-center gap-1.5">
              <Clock size={12} /> Submitted {formatDate(createdAt)}
            </p>
          )}

          {sectionsWithData.map((s) => (
            <div key={s.title}>
              <p className="text-[11px] uppercase tracking-wide text-ink/35 font-medium mb-2">{s.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {s.fields.map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <p className="text-[11px] text-ink/40">{fieldLabel(k)}</p>
                    <p className="text-sm text-ink/85 break-words">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {otherFields.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/35 font-medium mb-2">Other details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {otherFields.map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <p className="text-[11px] text-ink/40">{fieldLabel(k)}</p>
                    <p className="text-sm text-ink/85 break-words">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <details className="group">
            <summary className="flex items-center gap-1.5 text-[11px] text-ink/35 hover:text-ink/60 font-mono cursor-pointer select-none list-none">
              <Braces size={11} /> Raw JSON
            </summary>
            <pre className="text-[11px] bg-paper-dim rounded-lg p-3 mt-2 overflow-x-auto font-mono text-ink/70">{JSON.stringify(item, null, 2)}</pre>
          </details>
        </div>

        {/* Footer actions */}
        {isPending && (onApprove || onReject) && (
          <div className="flex gap-2 justify-end p-5 border-t border-line shrink-0">
            {onReject && (
              <button
                disabled={busy}
                onClick={() => onReject(item)}
                onMouseDown={addRipple}
                className="btn-animated flex items-center gap-1.5 text-sm font-medium border border-danger/30 text-danger rounded-lg px-4 py-2 hover:bg-danger/5 disabled:opacity-50"
              >
                <X size={14} /> Reject
              </button>
            )}
            {onApprove && (
              <button
                disabled={busy}
                onClick={() => onApprove(item)}
                onMouseDown={addRipple}
                className="btn-animated flex items-center gap-1.5 text-sm font-medium bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-light disabled:opacity-50"
              >
                <Check size={14} /> {busy ? "Saving..." : "Approve"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
