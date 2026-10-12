import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import Card, { SeverityBadge } from "../components/Card";
import { SkeletonStatCard, SkeletonCardList } from "../components/Skeleton";
import RangeToggle from "../components/RangeToggle";
import { useSimulatedLoading } from "../utils/useSimulatedLoading";
import { addRecentDistrict } from "../utils/recentDistricts";
import { districts, trendData, alerts } from "../data/dummyData";
import { useComplaints } from "../store/ComplaintsContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ArrowLeft, Leaf, Droplets, ThermometerSun, Bell, FileWarning, Send, MapPin, Sparkles } from "lucide-react";

export default function DistrictDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const loading = useSimulatedLoading(500);
  const [range, setRange] = useState("6mo");
  const chartData = range === "6mo" ? trendData.slice(-6) : trendData;
  const { complaints } = useComplaints();

  const base = pathname.startsWith("/farmer") ? "/farmer" : pathname.startsWith("/public") ? "/public" : "/pdma";
  const isAdmin = base === "/pdma";

  const district = districts.find((d) => String(d.id) === String(id));
  const districtAlerts = alerts.filter((a) => a.district === district?.name);
  const districtComplaints = isAdmin ? complaints.filter((c) => c.district === district?.name) : [];

  useEffect(() => {
    if (district) addRecentDistrict(district.id);
  }, [district?.id]);

  if (!district) {
    return (
      <>
        <Topbar title="District not found" />
        <main className="p-4 sm:p-8" dir="ltr">
          <Card>
            <p className="text-sm text-ink/60">We couldn't find that district.</p>
            <button onClick={() => navigate(`${base}`)} className="btn-animated mt-3 text-sm font-medium text-primary hover:underline">
              ← Back to dashboard
            </button>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title={district.name} subtitle={`${district.province} · District Detail`} />
      <main className={`${isAdmin ? "pdma-page" : "farmer-page"} p-4 sm:p-8 space-y-6`} dir="ltr">
        <button
          onClick={() => navigate(-1)}
          className="btn-animated flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> District intelligence</span>
                <h2 className="farmer-hero-title">{district.name}</h2>
                <p className="farmer-hero-copy">A focused view of drought status, environmental indicators, trend data and district alerts.</p>
                <div className="farmer-hero-actions">
                  <span className="farmer-hero-button"><MapPin size={14} /> {district.province}</span>
                  <span className="farmer-hero-button"><Bell size={14} /> {districtAlerts.length} alert{districtAlerts.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <SeverityBadge level={district.severity} />
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>NDVI</span><strong>{district.ndvi.toFixed(2)}</strong></div>
              <div className="farmer-hero-stat"><span>SPI-3</span><strong>{district.spi3.toFixed(1)}</strong></div>
              <div className="farmer-hero-stat"><span>Soil moisture</span><strong>{district.soilMoisture}%</strong></div>
            </div>
          </div>
        </section>

        <Card className="farmer-form-card flex items-center justify-between flex-wrap gap-4" scan>
          <div>
            <p className="text-xs uppercase text-ink/40 font-medium">Current Status</p>
            <div className="flex items-center gap-3 mt-1">
              <SeverityBadge level={district.severity} />
              <span className="text-sm text-ink/50">Updated every 10 days from satellite pass</span>
            </div>
          </div>
          {isAdmin && (
            <Link
              to={`/admin/alerts?district=${encodeURIComponent(district.name)}`}
              className="btn-animated flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors"
            >
              <Send size={14} /> Send alert to this district
            </Link>
          )}
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="farmer-data-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Leaf size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">NDVI</p>
                <p className="font-display text-xl font-semibold">{district.ndvi.toFixed(2)}</p>
              </div>
            </Card>
            <Card className="farmer-data-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warn/10 flex items-center justify-center shrink-0">
                <ThermometerSun size={16} className="text-warn" />
              </div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">SPI-3</p>
                <p className="font-display text-xl font-semibold">{district.spi3.toFixed(1)}</p>
              </div>
            </Card>
            <Card className="farmer-data-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                <Droplets size={16} className="text-danger" />
              </div>
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">Soil Moisture</p>
                <p className="font-display text-xl font-semibold">{district.soilMoisture}%</p>
              </div>
            </Card>
          </div>
        )}

        <Card className="farmer-form-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="font-display font-semibold">Trend</p>
            <RangeToggle range={range} setRange={setRange} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dd-ndvi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3F8C2C" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3F8C2C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#12160F99" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE1D3", fontSize: 12 }} />
              <Area type="monotone" dataKey="ndvi" stroke="#3F8C2C" fill="url(#dd-ndvi)" strokeWidth={2} name="NDVI" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-ink/35 mt-2">Shared demo trend data — will reflect this district's real satellite history once connected.</p>
        </Card>

        <Card className="farmer-form-card">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-primary" />
            <p className="font-display font-semibold">Alerts for {district.name}</p>
          </div>
          {loading ? (
            <SkeletonCardList count={2} />
          ) : districtAlerts.length === 0 ? (
            <p className="text-sm text-ink/45">No alerts on record for this district.</p>
          ) : (
            <div className="space-y-3">
              {districtAlerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-line last:border-0 last:pb-0">
                  <SeverityBadge level={a.severity} />
                  <div className="min-w-0">
                    <p className="text-sm text-ink/70">{a.message}</p>
                    <p className="text-xs text-ink/35 font-mono mt-0.5">{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {isAdmin && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileWarning size={16} className="text-primary" />
              <p className="font-display font-semibold">Complaints from {district.name}</p>
            </div>
            {districtComplaints.length === 0 ? (
              <p className="text-sm text-ink/45">No complaints filed from this district.</p>
            ) : (
              <div className="space-y-2">
                {districtComplaints.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border border-line rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.category}</p>
                      <p className="text-xs text-ink/40 font-mono">{c.id} · {c.farmer}</p>
                    </div>
                    <span className="text-xs text-ink/50">{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>
    </>
  );
}
