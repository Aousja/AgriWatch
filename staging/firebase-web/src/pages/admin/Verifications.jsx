import Topbar from "../../components/Topbar";
import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatusBadge } from "../../components/Card";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useRegistrations } from "../../store/RegistrationsContext";
import { addRipple } from "../../utils/ripple";
import { ShieldCheck, Sprout, Users2, Check, X } from "lucide-react";
import { useToast } from "../../components/ToastContext";

const roleIcon = { admin: ShieldCheck, farmer: Sprout, public: Users2 };
const roleLabel = { admin: "Admin / PDMA", farmer: "Farmer", public: "General Public" };

// Reuse the existing StatusBadge color logic by mapping our statuses onto
// the same visual language (Pending ~ Under Review, Approved ~ Resolved).
const statusAlias = { Pending: "Under Review", Approved: "Resolved", Rejected: "Forwarded" };

export default function Verifications() {
  const { t } = useLanguage();
  const { registrations, setStatus } = useRegistrations();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(null); // registration pending rejection confirm

  const pending = registrations.filter((r) => r.status === "Pending");
  const decided = registrations.filter((r) => r.status !== "Pending");

  function decide(r, status) {
    setStatus(r.id, status);
    showToast(
      status === "Approved" ? `${roleLabel[r.role]} request approved` : `${roleLabel[r.role]} request rejected`,
      status === "Approved" ? "success" : "info"
    );
  }

  function confirmReject() {
    if (confirming) decide(confirming, "Rejected");
    setConfirming(null);
  }

  return (
    <>
      <Topbar
        title="User Verifications"
        subtitle="Review new Farmer, General Public, and PDMA officer registrations"
      />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <p className="text-xs uppercase text-ink/40 font-medium">Pending</p>
            <p className="font-display text-2xl font-semibold mt-1">{pending.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink/40 font-medium">Approved</p>
            <p className="font-display text-2xl font-semibold mt-1">{registrations.filter((r) => r.status === "Approved").length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink/40 font-medium">Rejected</p>
            <p className="font-display text-2xl font-semibold mt-1">{registrations.filter((r) => r.status === "Rejected").length}</p>
          </Card>
        </div>

        <Card>
          <p className="font-display font-semibold mb-4">Pending Requests</p>
          {pending.length === 0 && <p className="text-sm text-ink/45">Nothing waiting on approval.</p>}
          <div className="space-y-3">
            {pending.map((r) => {
              const Icon = roleIcon[r.role];
              return (
                <div key={r.id} className="border border-line rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {r.role === "admin" ? r.designation : r.role === "farmer" ? "Farmer applicant" : (r.name || "Public applicant")}
                        <span className="text-ink/40 font-normal"> · {roleLabel[r.role]}</span>
                      </p>
                      <p className="text-xs text-ink/50 mt-0.5">
                        {r.district}{r.tehsil ? `, ${r.tehsil}` : ""} · {r.phone}
                        {r.crop && <> · {r.crop}</>}
                        {r.farmSize && <> · {r.farmSize}</>}
                      </p>
                      <p className="text-[10px] text-ink/35 font-mono mt-1">{r.id} · {r.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setConfirming(r)}
                      onMouseDown={addRipple}
                      className="btn-animated flex items-center gap-1.5 text-xs font-medium border border-danger/30 text-danger rounded-lg px-3 py-2 hover:bg-danger/5"
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      onClick={() => decide(r, "Approved")}
                      onMouseDown={addRipple}
                      className="btn-animated flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-2 hover:bg-primary-light"
                    >
                      <Check size={14} /> Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="font-display font-semibold mb-4">Decision History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">District</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                    <td className="py-2.5 font-mono text-xs text-ink/50">{r.id}</td>
                    <td className="py-2.5 text-ink/60">{roleLabel[r.role]}</td>
                    <td className="py-2.5 text-ink/60">{r.district}</td>
                    <td className="py-2.5 font-mono text-xs text-ink/50">{r.date}</td>
                    <td className="py-2.5"><StatusBadge status={statusAlias[r.status]} /></td>
                  </tr>
                ))}
                {decided.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-ink/40 text-sm">No decisions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <ConfirmDialog
        open={!!confirming}
        title={`Reject this ${confirming ? roleLabel[confirming.role] : ""} request?`}
        body="The applicant will need to sign up again if you reject this. This can't be undone from here."
        confirmLabel="Reject request"
        tone="danger"
        onConfirm={confirmReject}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
