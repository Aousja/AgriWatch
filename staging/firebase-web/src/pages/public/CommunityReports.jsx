import { Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import Card from "../../components/Card";
import OfflineNotice from "../../components/OfflineNotice";
import { useComplaints } from "../../store/ComplaintsContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CheckCircle2, Clock, Send, MessageSquarePlus, Bug, ArrowRight } from "lucide-react";

export default function CommunityReports() {
  const { t } = useLanguage();
  const { complaints, offline, error } = useComplaints();

  const underReview = complaints.filter((c) => c.status === "Under Review").length;
  const forwarded = complaints.filter((c) => c.status === "Forwarded").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;

  const byDistrict = Object.values(
    complaints.reduce((acc, c) => {
      acc[c.district] = acc[c.district] || { district: c.district, count: 0 };
      acc[c.district].count += 1;
      return acc;
    }, {})
  );

  return (
    <>
      <Topbar
        title="Community Reports"
        subtitle="Aggregate view of farmer damage reports and PDMA response — no personal details shown"
      />
      <main className="p-4 sm:p-8 space-y-6 public-page" dir="ltr">
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">Community intelligence</span>
            <h2 className="public-hero-title">See how drought reports are moving through PDMA</h2>
            <p className="public-hero-copy">A privacy-safe community view of submitted drought damage reports and their response status across districts.</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>Under review</span><strong>{underReview}</strong></div>
            <div className="public-hero-stat"><span>Forwarded</span><strong>{forwarded}</strong></div>
            <div className="public-hero-stat"><span>Resolved</span><strong>{resolved}</strong></div>
          </div>
        </section>

        {offline && <OfflineNotice what="reports" error={error} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/public/complaint" className="block">
            <Card className="public-action-card">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquarePlus size={16} className="text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm flex items-center gap-1.5">
                  Submit a report <ArrowRight size={13} className="text-primary" />
                </p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Water shortage, crop damage or relief problems in your area — goes to your district
                  PDMA officer.
                </p>
              </div>
            </Card>
          </Link>
          <Link to="/public/report-issue" className="block">
            <Card className="public-action-card">
              <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                <Bug size={16} className="text-danger" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm flex items-center gap-1.5">
                  Report a software issue <ArrowRight size={13} className="text-danger" />
                </p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Something broken on the website or app? The AgriWatch admin team picks these up.
                </p>
              </div>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="public-data-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warn/10 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-warn" />
            </div>
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">Under Review</p>
              <p className="font-display text-xl font-semibold">{underReview}</p>
            </div>
          </Card>
          <Card className="public-data-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Send size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">Forwarded</p>
              <p className="font-display text-xl font-semibold">{forwarded}</p>
            </div>
          </Card>
          <Card className="public-data-card flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">Resolved</p>
              <p className="font-display text-xl font-semibold">{resolved}</p>
            </div>
          </Card>
        </div>

        <Card className="public-chart-card">
          <p className="font-display font-semibold mb-4">Reports by District</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDistrict}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
              <XAxis dataKey="district" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
              <Bar dataKey="count" fill="#3F8C2C" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <p className="text-xs text-ink/40">
          Farmer names, descriptions, and photos are private and only visible to the farmer and PDMA officers.
        </p>
      </main>
    </>
  );
}
