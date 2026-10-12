import { useState } from "react";
import Card, { StatCard } from "../../components/Card";
import { publicRegByDistrict, users } from "../../data/dummyData";
import { useComplaints } from "../../store/ComplaintsContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users2, TrendingUp, FileText, Download } from "lucide-react";

export default function AdminPortalReports() {
  const { complaints } = useComplaints();
  const total = publicRegByDistrict.reduce((s, d) => s + d.count, 0);
  const [range, setRange] = useState("Last 30 days");
  const [generated, setGenerated] = useState([
    { id: "RPT-A03", scope: "Full platform summary", range: "Jul 1 – Jul 31", date: "2026-08-01" },
    { id: "RPT-A02", scope: "Full platform summary", range: "Jun 1 – Jun 30", date: "2026-07-01" },
  ]);

  function handleGenerate() {
    const rpt = {
      id: `RPT-A0${generated.length + 4}`,
      scope: "Full platform summary",
      range,
      date: new Date().toISOString().slice(0, 10),
    };
    setGenerated([rpt, ...generated]);
  }

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Reports</h1>
        <p className="text-sm text-ink/50 mt-1">Platform-wide activity — registrations, complaints, and account growth across every district.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Registered" value={total} icon={Users2} delta="Across 5 districts" deltaTone="ok" />
        <StatCard label="Top District" value="Peshawar" icon={TrendingUp} delta="148 users" deltaTone="ok" />
        <StatCard label="Growth (30d)" value="+18%" icon={TrendingUp} delta="Awareness campaign impact" deltaTone="ok" />
      </div>

      <Card>
        <p className="font-display font-semibold mb-4">Registrations by District</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={publicRegByDistrict}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
            <XAxis dataKey="district" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
            <Bar dataKey="count" fill="#3F8C2C" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <p className="font-display font-semibold mb-4">Generate Full App Report</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm bg-surface md:col-span-2">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last quarter</option>
          </select>
          <button onClick={handleGenerate} className="flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-light transition-colors">
            <FileText size={15} /> Generate Report
          </button>
        </div>
        <p className="text-xs text-ink/40 mt-3">
          Includes total users ({users.length}), farmer complaints ({complaints.length}), access-request approvals, and registration
          growth for the selected period, across all districts.
        </p>
      </Card>

      <Card>
        <p className="font-display font-semibold mb-4">Generated Reports</p>
        <div className="space-y-2">
          {generated.map((r) => (
            <div key={r.id} className="flex items-center justify-between border border-line rounded-lg px-4 py-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-primary" />
                <div>
                  <p className="text-sm font-medium">{r.scope} — {r.range}</p>
                  <p className="text-xs text-ink/40 font-mono">{r.id} · generated {r.date}</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <Download size={13} /> Download PDF
              </button>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
