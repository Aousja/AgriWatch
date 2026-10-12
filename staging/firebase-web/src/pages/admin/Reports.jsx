import { useState } from "react";
import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { districts } from "../../data/dummyData";
import { FileText, Download } from "lucide-react";

export default function Reports() {
  const { t } = useLanguage();
  const [district, setDistrict] = useState("All Districts");
  const [range, setRange] = useState("Last 30 days");
  const [generated, setGenerated] = useState([
    { id: "RPT-018", district: "Tharparkar", range: "Jun 15 – Jul 15", date: "2026-07-15" },
    { id: "RPT-017", district: "All Districts", range: "Jun 1 – Jun 30", date: "2026-07-01" },
  ]);

  function handleGenerate() {
    const rpt = {
      id: `RPT-0${generated.length + 19}`,
      district,
      range,
      date: new Date().toISOString().slice(0, 10),
    };
    setGenerated([rpt, ...generated]);
  }

  return (
    <>
      <Topbar title={t("ptAdminReportsTitle")} subtitle={t("ptAdminReportsSub")} />
      <main className="p-4 sm:p-8 space-y-6 pdma-page" dir="ltr">
        <PdmaPageHero
          title="Drought reporting workspace"
          copy="Prepare district-level situation reports for PDMA review and keep a clear history of generated reporting periods."
          stats={[
            { label: "Generated reports", value: generated.length },
            { label: "Current scope", value: district },
            { label: "Reporting range", value: range },
          ]}
        />
        <Card className="pdma-form-card pdma-data-card">
          <p className="font-display font-semibold mb-4">Generate New Report</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm bg-surface">
              <option>All Districts</option>
              {districts.map((d) => <option key={d.id}>{d.name}</option>)}
            </select>
            <select value={range} onChange={(e) => setRange(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-sm bg-surface">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last quarter</option>
            </select>
            <button onClick={handleGenerate} className="flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-light transition-colors">
              <FileText size={15} /> Generate Report
            </button>
          </div>
          <p className="text-xs text-ink/40 mt-3">Includes severity maps, index values, trend charts, alerts dispatched, and complaints summary for the selected scope.</p>
        </Card>

        <Card>
          <p className="font-display font-semibold mb-4">Generated Reports</p>
          <div className="space-y-2">
            {generated.map((r) => (
              <div key={r.id} className="pdma-list-row flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium">{r.district} — {r.range}</p>
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
    </>
  );
}
