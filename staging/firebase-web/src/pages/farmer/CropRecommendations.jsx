import { useEffect, useMemo, useState } from "react";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import {
  Sprout,
  Droplets,
  CloudRain,
  Leaf,
  AlertTriangle,
  Sparkles,
  MapPin,
  BarChart3,
} from "lucide-react";
import { useMyProfile } from "../../hooks/useMyProfile";
import { predictDistrict } from "../../services/droughtService";
import { getMyFields } from "../../services/farmerFieldService";

function uiSeverity(level) {
  const v = String(level || "").toLowerCase();
  if (v === "severe") return "Extreme";
  if (v === "high") return "Severe";
  if (v === "moderate") return "Moderate";
  return "Normal";
}

function guidance(prediction) {
  if (!prediction) return [];
  const e = prediction.environmental_data || {};
  const probability = Number(prediction.drought_probability_percent || 0);
  const soil = Number(e.soil_moisture || 0);
  const rainfall = Number(e.rainfall_mm || 0);
  const ndvi = Number(e.ndvi || 0);
  const items = [];

  if (probability >= 60) items.push("Drought risk is elevated. Monitor this field closely and reduce avoidable water losses.");
  else if (probability >= 30) items.push("Drought risk is moderate. Continue regular field and moisture monitoring.");
  else items.push("Current drought risk is relatively low. Continue normal field monitoring.");

  if (soil < 0.15) items.push(`District soil moisture is low (${(soil * 100).toFixed(1)}%). Prioritize moisture conservation.`);
  else items.push(`District soil moisture is ${(soil * 100).toFixed(1)}%. Check field conditions before irrigation.`);

  if (rainfall < 20) items.push(`Recent rainfall is low (${rainfall.toFixed(1)} mm). Do not rely on rainfall alone for field water availability.`);
  else items.push(`Recent rainfall is ${rainfall.toFixed(1)} mm. Consider this before additional irrigation.`);

  if (ndvi < 0.25) items.push(`NDVI is ${ndvi.toFixed(3)}, indicating possible vegetation stress in the district.`);
  else items.push(`NDVI is ${ndvi.toFixed(3)}. Continue monitoring vegetation condition.`);

  return items;
}

function MetricCard({ icon: Icon, label, value, progress = 0 }) {
  return (
    <Card className="farmer-data-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="farmer-card-label">{label}</p>
          <p className="farmer-card-value">{value}</p>
        </div>
        <div className="farmer-data-icon"><Icon size={17} /></div>
      </div>
      <div className="farmer-progress-track"><span style={{ width: `${Math.min(Math.max(progress, 4), 100)}%` }} /></div>
    </Card>
  );
}

export default function CropRecommendations() {
  const { t } = useLanguage();
  const { user, profile, loading: profileLoading } = useMyProfile();
  const [fields, setFields] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profileLoading) return;
    if (!user || !profile?.district) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [fieldRows, districtPrediction] = await Promise.all([
          getMyFields(user.id),
          predictDistrict(profile.district),
        ]);
        if (!cancelled) {
          setFields(fieldRows);
          setPrediction(districtPrediction);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load field guidance.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, profile?.district, profileLoading]);

  const tips = useMemo(() => guidance(prediction), [prediction]);
  const env = prediction?.environmental_data || {};
  const severity = uiSeverity(prediction?.risk_level);
  const probability = Number(prediction?.drought_probability_percent || 0);
  const soil = Number(env.soil_moisture || 0);
  const rainfall = Number(env.rainfall_mm || 0);
  const ndvi = Number(env.ndvi || 0);

  return (
    <>
      <Topbar title={t("ptFarmerCropsTitle")} subtitle={profile?.district || "Your fields"} />

      <main className="farmer-page p-4 sm:p-8 space-y-6" dir="ltr">
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> Smart crop advisory</span>
                <h2 className="farmer-hero-title">Recommendations for your registered fields</h2>
                <p className="farmer-hero-copy">
                  AgriWatch combines your district drought prediction, soil moisture, rainfall and vegetation condition to generate practical field guidance.
                </p>
                {profile?.district && (
                  <div className="farmer-hero-actions">
                    <span className="farmer-hero-button"><MapPin size={14} /> {profile.district}</span>
                    <span className="farmer-hero-button"><Sprout size={14} /> {fields.length} registered field{fields.length === 1 ? "" : "s"}</span>
                  </div>
                )}
              </div>
              {prediction && <SeverityBadge level={severity} />}
            </div>

            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Drought probability</span><strong>{prediction ? `${probability.toFixed(1)}%` : "—"}</strong></div>
              <div className="farmer-hero-stat"><span>Soil moisture</span><strong>{prediction ? `${(soil * 100).toFixed(1)}%` : "—"}</strong></div>
              <div className="farmer-hero-stat"><span>NDVI</span><strong>{prediction ? ndvi.toFixed(3) : "—"}</strong></div>
            </div>
          </div>
        </section>

        {error && (
          <Card className="border-danger/30 bg-danger/5">
            <p className="text-sm text-danger flex gap-2"><AlertTriangle size={16} /> {error}</p>
          </Card>
        )}

        {prediction && (
          <section>
            <div className="farmer-section-title mb-3">
              <div>
                <h2>Current district conditions</h2>
                <p>Latest environmental inputs used by the advisory engine.</p>
              </div>
              <span className="text-xs text-ink/40 font-mono">ML + satellite indicators</span>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard icon={BarChart3} label="Drought risk" value={`${probability.toFixed(1)}%`} progress={probability} />
              <MetricCard icon={Droplets} label="Soil moisture" value={`${(soil * 100).toFixed(1)}%`} progress={soil * 100} />
              <MetricCard icon={CloudRain} label="Rainfall" value={`${rainfall.toFixed(1)} mm`} progress={Math.min(rainfall, 100)} />
              <MetricCard icon={Leaf} label="NDVI" value={ndvi.toFixed(3)} progress={Math.max(ndvi * 100, 0)} />
            </div>
          </section>
        )}

        <section>
          <div className="farmer-section-title mb-3">
            <div>
              <h2>Your field guidance</h2>
              <p>Each registered field receives the same district-level environmental advisory, paired with its crop and acreage.</p>
            </div>
          </div>

          {loading ? (
            <Card><p className="text-sm text-ink/40">Loading fields and ML data...</p></Card>
          ) : fields.length === 0 ? (
            <div className="farmer-empty-state">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><Sprout size={20} /></div>
              <p className="font-display font-semibold mt-3">No fields registered yet</p>
              <p className="text-sm text-ink/45 mt-1">Add fields to your farmer profile to receive field-by-field guidance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {fields.map((field) => (
                <article key={field.id} className="farmer-field-panel">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Sprout size={18} className="text-primary" /></div>
                      <div className="min-w-0">
                        <p className="font-display font-semibold truncate">{field.field_name}</p>
                        <p className="text-xs text-ink/45 mt-0.5 capitalize">{field.crop} · {Number(field.area_acres)} acres</p>
                      </div>
                    </div>
                    {prediction && <SeverityBadge level={severity} />}
                  </div>

                  <div className="farmer-advice-list">
                    {tips.map((tip, index) => (
                      <div key={index} className="farmer-advice-item">
                        <span className="farmer-advice-dot" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="farmer-callout">
          <p className="text-xs text-ink/55 leading-relaxed">
            Guidance uses district-level ML drought and environmental data. It is an advisory layer and is not a crop-growth prediction model.
          </p>
        </div>
      </main>
    </>
  );
}
