import { useState } from "react";
import Card from "../../components/Card";
import { SkeletonTableRows } from "../../components/Skeleton";
import SortableHeader from "../../components/SortableHeader";
import { useSimulatedLoading } from "../../utils/useSimulatedLoading";
import { useSortableData } from "../../utils/useSortableData";
import { users } from "../../data/dummyData";
import { Download } from "lucide-react";
import { addRipple } from "../../utils/ripple";
import { useToast } from "../../components/ToastContext";

// This directory is seeded from local sample data for now. Once approved
// requests are meant to create real rows in the user_profiles table in
// Supabase, swap `users` below for a useSupabaseTable("user_profiles") call.
export default function AdminPortalUsers() {
  const { showToast } = useToast();
  const loading = useSimulatedLoading(500);
  const [filter, setFilter] = useState("All");
  const roles = ["All", "Farmer", "General Public", "Admin / PDMA"];
  const filtered = filter === "All" ? users : users.filter((u) => u.role === filter);
  const { sorted, sortConfig, requestSort } = useSortableData(filtered);

  const counts = {
    total: users.length,
    farmers: users.filter((u) => u.role === "Farmer").length,
    public: users.filter((u) => u.role === "General Public").length,
    officers: users.filter((u) => u.role === "Admin / PDMA").length,
  };

  function exportCsv() {
    const headers = ["ID", "Name", "Role", "District", "Crop", "Farm Size", "Registered"];
    const rows = sorted.map((u) => [u.id, u.name, u.role, u.district, u.crop, u.farmSize, u.registered]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agriwatch-users-${filter.replace(/\s+/g, "-").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported ${filtered.length} users to CSV`, "success");
  }

  return (
    <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Users & PDMA Officers</h1>
        <p className="text-sm text-ink/50 mt-1">Every approved account across the platform — farmers, general public, and PDMA officers.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="!p-4"><p className="text-xs text-ink/45">Total users</p><p className="text-2xl font-semibold mt-1">{counts.total}</p></Card>
        <Card className="!p-4"><p className="text-xs text-ink/45">Farmers</p><p className="text-2xl font-semibold mt-1">{counts.farmers}</p></Card>
        <Card className="!p-4"><p className="text-xs text-ink/45">General public</p><p className="text-2xl font-semibold mt-1">{counts.public}</p></Card>
        <Card className="!p-4"><p className="text-xs text-ink/45">PDMA officers</p><p className="text-2xl font-semibold mt-1">{counts.officers}</p></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              onMouseDown={addRipple}
              className={`btn-animated px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === r ? "bg-forest text-white border-forest" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          onMouseDown={addRipple}
          className="btn-animated flex items-center gap-2 bg-surface border border-line rounded-lg px-3 py-2 text-xs font-medium hover:bg-paper-dim"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                <SortableHeader label="ID" sortKey="id" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Role" sortKey="role" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="District" sortKey="district" sortConfig={sortConfig} onSort={requestSort} />
                <th className="pb-2 font-medium">Crop</th>
                <th className="pb-2 font-medium">Farm Size</th>
                <SortableHeader label="Registered" sortKey="registered" sortConfig={sortConfig} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={6} cols={7} />
              ) : (
                sorted.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                    <td className="py-2.5 font-mono text-xs text-ink/50">{u.id}</td>
                    <td className="py-2.5 font-medium">{u.name}</td>
                    <td className="py-2.5 text-ink/60">{u.role}</td>
                    <td className="py-2.5 text-ink/60">{u.district}</td>
                    <td className="py-2.5 text-ink/60">{u.crop}</td>
                    <td className="py-2.5 text-ink/60">{u.farmSize}</td>
                    <td className="py-2.5 font-mono text-xs text-ink/50">{u.registered}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
