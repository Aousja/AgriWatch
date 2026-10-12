import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { SkeletonStatCard } from "../../components/Skeleton";
import { predictDistrict, getDistrictHistory, getAlerts } from "../../services/droughtService";
import { useMyProfile } from "../../hooks/useMyProfile";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CloudRain,
  Droplets,
  Gauge,
  Leaf,
  MapPinned,
  MessageSquareWarning,
  ScanLine,
  Sprout,
  Waves,
} from "lucide-react";

function getSeverity(riskLevel) {
  const level = String(riskLevel || "").toLowerCase();
  if (level === "severe") return "Extreme";
  if (level === "high") return "Severe";
  if (level === "moderate") return "Moderate";
  return "Normal";
}

function formatMonth(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-US", { month: "short" });
}

const severityTheme = {
  Normal: { label: "Conditions are stable", tone: "normal" },
  Moderate: { label: "Monitor crops closely", tone: "moderate" },
  Severe: { label: "Take preventive action", tone: "severe" },
  Extreme: { label: "Urgent drought response", tone: "extreme" },
};

export default function FarmerHome() {
  const { t } = useLanguage();
  const { profile, loading: profileLoading, error: profileError } = useMyProfile();

  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingPrediction, setLoadingPrediction] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [predictionError, setPredictionError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [alertsError, setAlertsError] = useState("");

  const farmerName = profile?.full_name || "Farmer";
  const firstName = farmerName.split(" ")[0];
  const farmerDistrict = profile?.district?.trim() || "";

  const farmerCrops = useMemo(() => {
    if (Array.isArray(profile?.crops)) {
      return profile.crops
        .map((crop) => typeof crop === "string" ? crop : crop?.crop_name || crop?.name || crop?.crop || "")
        .filter(Boolean);
    }
    return profile?.crop ? [profile.crop] : [];
  }, [profile]);

  const farmerCropText = farmerCrops.length ? farmerCrops.join(", ") : "Crop not set";
  const farmerFarmSize = profile?.farm_size || "Farm size not set";

  useEffect(() => {
    if (profileLoading) return;
    if (!farmerDistrict) {
      setPrediction(null);
      setHistory([]);
      setAlerts([]);
      setLoadingPrediction(false);
      setLoadingHistory(false);
      setLoadingAlerts(false);
      setPredictionError("No district is assigned to your farmer profile. Please update your district in Settings.");
      return;
    }

    let cancelled = false;

    async function loadPrediction() {
      try {
        setLoadingPrediction(true);
        setPredictionError("");
        const response = await predictDistrict(farmerDistrict);
        if (!cancelled) setPrediction(response);
      } catch (err) {
        if (!cancelled) {
          setPrediction(null);
          setPredictionError(err.message || "Unable to load district drought prediction.");
        }
      } finally {
        if (!cancelled) setLoadingPrediction(false);
      }
    }

    async function loadHistory() {
      try {
        setLoadingHistory(true);
        setHistoryError("");
        const response = await getDistrictHistory(farmerDistrict);
        if (!cancelled) setHistory(response?.history || []);
      } catch (err) {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(err.message || "Unable to load district history.");
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    async function loadAlerts() {
      try {
        setLoadingAlerts(true);
        setAlertsError("");
        const response = await getAlerts();
        if (!cancelled) setAlerts(response?.alerts || []);
      } catch (err) {
        if (!cancelled) {
          setAlerts([]);
          setAlertsError(err.message || "Unable to load alerts.");
        }
      } finally {
        if (!cancelled) setLoadingAlerts(false);
      }
    }

    loadPrediction();
    loadHistory();
    loadAlerts();
    return () => { cancelled = true; };
  }, [farmerDistrict, profileLoading]);

  const environmental = prediction?.environmental_data || {};
  const ndvi = Number(environmental.ndvi ?? 0);
  const soilMoisture = Number(environmental.soil_moisture ?? 0);
  const rainfall = Number(environmental.rainfall_mm ?? 0);
  const temperature = Number(environmental.temperature_c ?? environmental.temperature ?? 0);
  const severity = getSeverity(prediction?.risk_level);
  const probability = Number(prediction?.drought_probability_percent ?? 0);
  const severityInfo = severityTheme[severity] || severityTheme.Normal;

  const chartData = useMemo(() => history.map((item) => ({
    date: item.date || item.month || "",
    month: formatMonth(item.date || item.month),
    ndvi: Number(item.ndvi ?? 0),
    soilMoisture: Number(item.soil_moisture ?? 0),
    droughtProbability: Number(item.drought_probability_percent ?? item.drought_probability ?? 0),
  })), [history]);

  const latestAlert = useMemo(() => {
    if (!farmerDistrict) return null;
    const normalized = farmerDistrict.toLowerCase().replace(/\s+district$/i, "").trim();
    return alerts
      .filter((alert) => String(alert.district || "").toLowerCase().replace(/\s+district$/i, "").trim() === normalized)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0] || null;
  }, [alerts, farmerDistrict]);

  if (profileError) {
    return (
      <>
        <Topbar title="Farmer Portal" subtitle="AgriWatch" />
        <main className="p-4 sm:p-8">
          <Card><div className="flex items-start gap-3"><AlertTriangle className="text-red-500" size={20} /><div><p className="font-semibold">Unable to load farmer profile</p><p className="text-sm text-ink/50 mt-1">Please refresh the page or sign in again.</p></div></div></Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={`${t("welcomeGreeting")}, ${firstName}`}
        subtitle={farmerDistrict ? `${farmerDistrict} · ${farmerCropText} · ${farmerFarmSize}` : `${farmerCropText} · ${farmerFarmSize}`}
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 farmer-dashboard" dir="ltr">
        <section className={`farmer-hero farmer-hero-${severityInfo.tone} animate-fade-up`}>
          <div className="farmer-hero-grid" />
          <div className="farmer-hero-glow" />
          <div className="relative z-10 grid lg:grid-cols-[1.15fr_.85fr] gap-7 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="farmer-live-pill"><span /> LIVE DISTRICT INTELLIGENCE</span>
                {farmerDistrict && <span className="farmer-location-pill"><MapPinned size={13} /> {farmerDistrict}</span>}
              </div>
              <p className="text-white/55 text-xs uppercase tracking-[0.18em] mt-6">Current drought condition</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white">{loadingPrediction ? "Scanning…" : severity}</h2>
                {!loadingPrediction && prediction && <SeverityBadge level={severity} />}
              </div>
              <p className="text-white/70 mt-3 max-w-xl">{loadingPrediction ? "AgriWatch is reading your latest environmental indicators." : prediction ? severityInfo.label : predictionError || "No prediction is available yet."}</p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link to="/farmer/irrigation" className="farmer-hero-action"><Droplets size={16} /> Check irrigation <ArrowRight size={14} /></Link>
                <Link to="/farmer/crops" className="farmer-hero-action farmer-hero-action-soft"><Sprout size={16} /> Crop advice</Link>
              </div>
            </div>

            <div className="farmer-risk-panel">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-white/45">ML drought probability</p><p className="font-display text-3xl text-white font-semibold mt-1">{loadingPrediction ? "--" : `${probability.toFixed(1)}%`}</p></div>
                <div className="farmer-scan-icon"><ScanLine size={22} /></div>
              </div>
              <div className="farmer-risk-track mt-5"><span style={{ width: `${Math.min(Math.max(probability, 2), 100)}%` }} /></div>
              <div className="flex justify-between text-[10px] text-white/38 mt-2"><span>LOW</span><span>MODERATE</span><span>HIGH</span></div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <div className="farmer-mini-readout"><span>Data date</span><strong>{prediction?.data_date || "Latest"}</strong></div>
                <div className="farmer-mini-readout"><span>Crop profile</span><strong>{farmerCrops.length || 0} crop{farmerCrops.length === 1 ? "" : "s"}</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 farmer-metric-grid">
          {loadingPrediction || profileLoading ? (
            <><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></>
          ) : (
            <>
              <FarmerMetric icon={Leaf} label="NDVI" value={ndvi.toFixed(3)} note="Vegetation health" progress={Math.max(0, Math.min(ndvi * 100, 100))} />
              <FarmerMetric icon={Droplets} label="Soil Moisture" value={`${(soilMoisture * 100).toFixed(1)}%`} note="Current moisture" progress={Math.max(0, Math.min(soilMoisture * 100, 100))} />
              <FarmerMetric icon={CloudRain} label="Rainfall" value={`${rainfall.toFixed(1)} mm`} note="Monthly rainfall" progress={Math.max(0, Math.min((rainfall / 100) * 100, 100))} />
              <FarmerMetric icon={Gauge} label="Temperature" value={temperature ? `${temperature.toFixed(1)}°C` : "--"} note="Environmental reading" progress={temperature ? Math.max(0, Math.min((temperature / 50) * 100, 100)) : 0} />
            </>
          )}
        </section>

        <section className="grid xl:grid-cols-[1.55fr_.8fr] gap-6">
          <Card className="farmer-chart-card animate-fade-up animation-delay-100">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div><p className="font-display text-lg font-semibold">District vegetation trend</p><p className="text-xs text-ink/45 mt-1">Historical NDVI for {prediction?.district || farmerDistrict || "your district"}</p></div>
              {!loadingHistory && <span className="farmer-data-tag">{history.length} months</span>}
            </div>

            {loadingHistory ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-ink/40">Loading district history…</div>
            ) : historyError ? (
              <div className="h-[260px] flex items-center justify-center text-center"><div><p className="text-sm text-ink/50">District history could not be loaded.</p><p className="text-xs text-red-500 mt-1">{historyError}</p></div></div>
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fh-ndvi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3F8C2C" stopOpacity={0.38} /><stop offset="95%" stopColor="#3F8C2C" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCE1D3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#12160F88" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#12160F88" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #DCE1D3", fontSize: 12 }} formatter={(value) => [Number(value).toFixed(3), "NDVI"]} />
                  <Area type="monotone" dataKey="ndvi" stroke="#3F8C2C" fill="url(#fh-ndvi)" strokeWidth={2.5} name="NDVI" animationDuration={1100} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[260px] flex items-center justify-center text-sm text-ink/40">No historical data available.</div>}
          </Card>

          <Card className="farmer-alert-card animate-fade-up animation-delay-200">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2"><span className="farmer-alert-icon"><Bell size={16} /></span><div><p className="font-display font-semibold">{t("latestAlert")}</p><p className="text-[11px] text-ink/40 mt-0.5">PDMA district notification</p></div></div>
              <Link to="/farmer/alerts" className="text-xs font-semibold text-primary hover:underline">View all</Link>
            </div>

            {loadingAlerts ? <p className="text-sm text-ink/40">Loading alerts…</p> : alertsError ? <div><p className="text-sm text-ink/50">Unable to load alerts.</p><p className="text-xs text-red-500 mt-2">{alertsError}</p></div> : latestAlert ? (
              <div className="farmer-alert-body">
                <SeverityBadge level={latestAlert.severity} />
                <p className="text-sm text-ink/75 mt-4 leading-relaxed">{latestAlert.message}</p>
                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between text-xs text-ink/40"><span className="font-mono">{latestAlert.date}</span><span className="text-primary font-semibold">{latestAlert.status || "Active"}</span></div>
              </div>
            ) : (
              <div className="farmer-empty-alert"><Bell size={24} /><p className="text-sm font-semibold mt-3">{t("noActiveAlerts")}</p><p className="text-xs text-ink/40 mt-1">No alerts have been dispatched for {farmerDistrict || "your district"}.</p></div>
            )}
          </Card>
        </section>

        <section className="animate-fade-up animation-delay-300">
          <div className="flex items-end justify-between gap-4 mb-4"><div><p className="font-display text-lg font-semibold">Farmer quick actions</p><p className="text-xs text-ink/45 mt-1">Your most-used AgriWatch tools in one place.</p></div></div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <QuickAction to="/farmer/crops" icon={Sprout} title="Crop recommendations" body="Get crop advice from current drought conditions." />
            <QuickAction to="/farmer/irrigation" icon={Waves} title="Irrigation schedule" body="See whether to irrigate, reduce or skip." />
            <QuickAction to="/farmer/calendar" icon={CalendarDays} title="Crop calendar" body="Review seasonal crop activities and timing." />
            <QuickAction to="/farmer/complaints" icon={MessageSquareWarning} title="Report Drought Situation" body="Submit and track a drought report with AgriWatch admins." />
          </div>
        </section>
      </main>
    </>
  );
}

function FarmerMetric({ icon: Icon, label, value, note, progress }) {
  return (
    <div className="farmer-metric-card">
      <div className="flex items-start justify-between gap-3"><div className="farmer-metric-icon"><Icon size={18} /></div><span className="farmer-metric-live">LIVE</span></div>
      <p className="text-xs text-ink/45 mt-5">{label}</p>
      <p className="font-display text-xl sm:text-2xl font-semibold mt-1">{value}</p>
      <div className="farmer-metric-track mt-4"><span style={{ width: `${progress}%` }} /></div>
      <p className="text-[11px] text-ink/35 mt-2">{note}</p>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, body }) {
  return (
    <Link to={to} className="farmer-quick-card group">
      <div className="farmer-quick-icon"><Icon size={19} /></div>
      <p className="font-semibold text-sm mt-4">{title}</p>
      <p className="text-xs text-ink/45 leading-relaxed mt-1.5">{body}</p>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-4">Open <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" /></span>
    </Link>
  );
}
