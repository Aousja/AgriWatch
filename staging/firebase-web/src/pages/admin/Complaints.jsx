import { isPermittedAssignment } from "../../supabase/reportContract";
import { useSupabaseAuth } from "../../supabase/useSupabaseAuth";
import ReportReviewActions from "../../components/ReportReviewActions";
import { useState } from "react";
import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { StatusBadge } from "../../components/Card";
import { SkeletonTableRows } from "../../components/Skeleton";
import SortableHeader from "../../components/SortableHeader";
import { useSortableData } from "../../utils/useSortableData";
import { useComplaints } from "../../store/ComplaintsContext";
import OfflineNotice from "../../components/OfflineNotice";
import { Image as ImageIcon, X, Bug, Sprout, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { addRipple } from "../../utils/ripple";

const roleLabel = { farmer: "Farmer", public: "Public" };
const roleIcon = { farmer: Sprout, public: Users2 };

export default function Complaints() {
  const { t } = useLanguage();
  const { complaints: allReports, access, loading, offline, error } = useComplaints();
  const { user } = useSupabaseAuth();
  const complaints = allReports.filter(report => isPermittedAssignment(report, user?.id, access?.districts || []));
  const [open, setOpen] = useState(null); // complaint object being viewed
  const [note, setNote] = useState("");

  const { sorted, sortConfig, requestSort } = useSortableData(complaints);

  function openReport(c) {
    setOpen(c);
    setNote(c.pdmaResponseNote || "");
  }

  function closeReport() {
    setOpen(null);
    setNote("");
  }


  return (
    <>
      <Topbar title={t("ptAdminComplaintsTitle")} subtitle={t("ptAdminComplaintsSub")} />
      <main className="p-4 sm:p-8 space-y-6 pdma-page" dir="ltr">
        <PdmaPageHero
          title="Complaint operations desk"
          copy="Review assigned drought situation reports and keep responses and resolution notes attached to each report."
          stats={[
            { label: "Total complaints", value: complaints.length },
            { label: "Under review", value: complaints.filter((c) => c.workflowStatus === "Under Review").length },
            { label: "Resolved", value: complaints.filter((c) => c.workflowStatus === "Resolved").length },
          ]}
        />
        {offline && <OfflineNotice what="complaints" error={error} />}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-ink/45">
            {offline
              ? "Showing locally stored complaints while Supabase is unreachable."
              : "Only explicitly assigned reports in your authorized district appear here."}
          </p>
          <Link
            to="/pdma/report-issue"
            className="flex items-center gap-1.5 text-xs font-medium text-danger border border-danger/30 rounded-lg px-3 py-1.5 hover:bg-danger/5"
          >
            <Bug size={13} /> Report a software issue
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {["Submitted", "Assigned for PDMA review", "Resolved"].map((s) => (
            <Card key={s}>
              <p className="text-xs uppercase text-ink/40 font-medium">{s}</p>
              <p className="font-display text-2xl font-semibold mt-1">
                {complaints.filter((c) => c.workflowStatus === s).length}
              </p>
            </Card>
          ))}
        </div>

        <Card>
          <p className="font-display font-semibold mb-4">Assigned drought reports</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                  <SortableHeader label="ID" sortKey="id" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Submitted by" sortKey="farmer" sortConfig={sortConfig} onSort={requestSort} />
                  <th className="pb-2 font-medium">From</th>
                  <SortableHeader label="District" sortKey="district" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Category" sortKey="category" sortConfig={sortConfig} onSort={requestSort} />
                  <th className="pb-2 font-medium">Photo</th>
                  <SortableHeader label="Date" sortKey="date" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} />
                  <th className="pb-2 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTableRows rows={5} cols={9} />
                ) : (
                  sorted.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                      <td className="py-2.5 font-mono text-xs text-ink/50">{c.id}</td>
                      <td className="py-2.5 font-medium">{c.farmer}</td>
                      <td className="py-2.5 text-ink/60">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          {(() => {
                            const Icon = roleIcon[c.role] || Sprout;
                            return <Icon size={12} className="text-ink/35" />;
                          })()}
                          {roleLabel[c.role] || c.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-ink/60">{c.district}</td>
                      <td className="py-2.5 text-ink/60">{c.category}</td>
                      <td className="py-2.5">
                        {c.photo ? (
                          <img
                            src={c.photo}
                            alt=""
                            onClick={() => openReport(c)}
                            className="w-9 h-9 rounded-md object-cover cursor-pointer border border-line hover:opacity-80"
                          />
                        ) : (
                          <span className="text-ink/25 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-ink/50">{c.date}</td>
                      <td className="py-2.5"><StatusBadge status={c.displayStatus} /></td>
                      <td className="py-2.5">
                        <button
                          onClick={() => openReport(c)}
                          onMouseDown={addRipple}
                          className="btn-animated text-xs font-medium text-primary border border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5"
                        >
                          View report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {open && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeReport}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-surface rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div>
                <p className="font-display font-semibold">{open.category}</p>
                <p className="text-xs text-ink/40 font-mono">{open.id} · {open.date}</p>
              </div>
              <button onClick={closeReport} aria-label="Close report" className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-0.5">Farmer</p>
                  <p className="font-medium">{open.farmer}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-0.5">District</p>
                  <p className="font-medium">{open.district}</p>
                </div>
              </div>

              {open.description && (
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-1">Description</p>
                  <p className="text-sm text-ink/70">{open.description}</p>
                </div>
              )}

              {open.photo ? (
                <div>
                  <p className="text-xs uppercase text-ink/40 font-medium mb-1 flex items-center gap-1.5">
                    <ImageIcon size={12} /> Attached photo
                  </p>
                  <img src={open.photo} alt="Report evidence" className="w-full rounded-lg border border-line" />
                </div>
              ) : (
                <p className="text-xs text-ink/40">No photo attached to this report.</p>
              )}

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1">Current Status</p>
                <StatusBadge status={open.displayStatus} />
              </div>

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium mb-1.5">Response / Resolution Note</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Response visible to the farmer"
                  className="border border-line rounded-lg px-3 py-2 text-sm bg-surface w-full"
                />
              </div>

              <ReportReviewActions key={open.dbId} report={open} note={note} pdma onUpdated={updated => setOpen(prev => prev?.dbId === updated.dbId ? updated : prev)} />
            </div>
          </div>
        </div>
      )}

    </>
  );
}
