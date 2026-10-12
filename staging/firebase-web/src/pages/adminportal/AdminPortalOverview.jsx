import { Link } from "react-router-dom";
import Card, { StatCard } from "../../components/Card";
import { users, publicRegByDistrict } from "../../data/dummyData";
import { useRegistrations } from "../../store/RegistrationsContext";
import { useSupabaseTable } from "../../supabase/useSupabaseTable";
import { useComplaints } from "../../store/ComplaintsContext";
import { useIssueReports } from "../../store/IssueReportsContext";
import { Users2, Sprout, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, XCircle, Bug, FileWarning } from "lucide-react";

const TABLE_NAME = "access_requests";
const ORDER_BY_FIELD = "submitted_at";

export default function AdminPortalOverview() {
  const { registrations } = useRegistrations();
  const { data: supabaseRequests } = useSupabaseTable(TABLE_NAME, ORDER_BY_FIELD);
  // Live from Supabase — the same rows the farmer/public/PDMA portals write to.
  const { complaints } = useComplaints();
  const { issues } = useIssueReports();

  const openComplaints = complaints.filter((c) => c.status !== "Resolved").length;
  const openIssues = issues.filter((i) => i.status === "Open" || i.status === "In Progress").length;
  const criticalIssues = issues.filter(
    (i) => i.severity === "Critical" && i.status !== "Resolved" && i.status !== "Closed"
  ).length;

  const totalUsers = users.length;
  const totalFarmers = users.filter((u) => u.role === "Farmer").length;
  const totalPublic = users.filter((u) => u.role === "General Public").length;
  const totalOfficers = users.filter((u) => u.role === "Admin / PDMA").length;

  const localPending = registrations.filter((r) => r.status === "Pending").length;
  const supabasePending = supabaseRequests.filter((r) => (r.status || "pending").toLowerCase() === "pending").length;
  const totalPending = localPending + supabasePending;

  const localApproved = registrations.filter((r) => r.status === "Approved").length;
  const supabaseApproved = supabaseRequests.filter((r) => (r.status || "").toLowerCase() === "approved").length;
  const localRejected = registrations.filter((r) => r.status === "Rejected").length;
  const supabaseRejected = supabaseRequests.filter((r) => (r.status || "").toLowerCase() === "rejected").length;

  const totalRegistrations = publicRegByDistrict.reduce((s, d) => s + d.count, 0);

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 page-enter">
      <section className="portal-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="portal-chip">Administrative control</span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mt-3">System approvals and operations</h2>
            <p className="text-white/72 mt-2 max-w-2xl">Review access requests, manage officers, and monitor platform-wide drought report and issue activity.</p>
          </div>
          <div className="portal-chip">AgriWatch admin center</div>
        </div>
        <div className="portal-hero-grid">
          <div className="portal-metric"><p className="portal-metric-label">Pending requests</p><p className="portal-metric-value">{totalPending}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Open drought reports</p><p className="portal-metric-value">{openComplaints}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">Open issues</p><p className="portal-metric-value">{openIssues}</p></div>
        </div>
      </section>

      {totalPending > 0 && (
        <Card className="border-warn/30 bg-warn/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warn/15 flex items-center justify-center shrink-0">
              <ClipboardCheck size={16} className="text-warn" />
            </div>
            <p className="text-sm">
              <span className="font-semibold">{totalPending}</span> access request{totalPending === 1 ? "" : "s"} waiting on your approval.
            </p>
          </div>
          <Link to="/admin-portal/requests" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0">
            Review requests <ArrowRight size={13} />
          </Link>
        </Card>
      )}

      {openIssues > 0 && (
        <Card className="border-danger/30 bg-danger/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-danger/15 flex items-center justify-center shrink-0">
              <Bug size={16} className="text-danger" />
            </div>
            <p className="text-sm">
              <span className="font-semibold">{openIssues}</span> software issue{openIssues === 1 ? "" : "s"} reported
              from the farmer, public and PDMA portals
              {criticalIssues > 0 && <span className="text-danger font-medium"> · {criticalIssues} critical</span>}.
            </p>
          </div>
          <Link to="/admin-portal/issues" className="flex items-center gap-1.5 text-xs font-medium text-danger hover:underline shrink-0">
            Triage issues <ArrowRight size={13} />
          </Link>
        </Card>
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Accounts</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={totalUsers} icon={Users2} delta="Farmers, public & officers" deltaTone="ok" />
          <StatCard label="Farmers" value={totalFarmers} icon={Sprout} delta="Approved farmer accounts" deltaTone="ok" />
          <StatCard label="General Public" value={totalPublic} icon={Users2} delta="Approved public accounts" deltaTone="ok" />
          <StatCard label="PDMA Officers" value={totalOfficers} icon={ShieldCheck} delta="Approved officer accounts" deltaTone="ok" />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Access requests (website + mobile app)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending" value={totalPending} icon={ClipboardCheck} delta="Awaiting your review" deltaTone={totalPending > 0 ? "warn" : "ok"} />
          <StatCard label="Approved" value={localApproved + supabaseApproved} icon={CheckCircle2} delta="All time" deltaTone="ok" />
          <StatCard label="Rejected" value={localRejected + supabaseRejected} icon={XCircle} delta="All time" deltaTone="danger" />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40 font-medium mb-3">Activity</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Public Registrations" value={totalRegistrations} icon={Users2} delta="Across 5 districts" deltaTone="ok" />
          <StatCard
            label="Drought Reports"
            value={complaints.length}
            icon={FileWarning}
            delta={`${openComplaints} still open`}
            deltaTone={openComplaints > 0 ? "warn" : "ok"}
          />
          <StatCard label="PDMA Districts Covered" value={new Set(users.filter((u) => u.role === "Admin / PDMA").map((u) => u.district)).size || 1} icon={ShieldCheck} delta="With an assigned officer" deltaTone="ok" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin-portal/requests" className="block">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Review access requests</p>
                <p className="text-sm text-ink/50 mt-1">Approve or reject new PDMA officer and farmer/public sign-ups.</p>
              </div>
              <ArrowRight size={18} className="text-ink/30 shrink-0" />
            </div>
          </Card>
        </Link>
        <Link to="/admin-portal/complaints" className="block">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Drought situation reports</p>
                <p className="text-sm text-ink/50 mt-1">Farmer and public damage reports from every district.</p>
              </div>
              <ArrowRight size={18} className="text-ink/30 shrink-0" />
            </div>
          </Card>
        </Link>
        <Link to="/admin-portal/issues" className="block">
          <Card className="hover:border-danger/40 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Software issues</p>
                <p className="text-sm text-ink/50 mt-1">Glitches reported by farmers, public users and PDMA officers.</p>
              </div>
              <ArrowRight size={18} className="text-ink/30 shrink-0" />
            </div>
          </Card>
        </Link>
        <Link to="/admin-portal/users" className="block">
          <Card className="hover:border-primary/40 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold">Browse users & officers</p>
                <p className="text-sm text-ink/50 mt-1">Full directory of every approved account, filterable by role.</p>
              </div>
              <ArrowRight size={18} className="text-ink/30 shrink-0" />
            </div>
          </Card>
        </Link>
      </div>
    </main>
  );
}
