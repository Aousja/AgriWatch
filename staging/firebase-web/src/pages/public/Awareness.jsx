import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";

import {
  Droplets,
  Sprout,
  Sun,
  ShieldAlert,
  Home,
  Leaf,
  CloudRain,
  Activity,
} from "lucide-react";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "https://agri-watch-backend.vercel.app")
).replace(/\/$/, "");
const USER_DISTRICT = "Peshawar District";

// ============================================================
// BASE PUBLIC AWARENESS TIPS
// ============================================================

const generalTips = [
  {
    id: "water",
    title: "Conserve Water",
    body:
      "Avoid unnecessary water use. Repair leaking pipes and use stored water carefully during dry periods.",
    icon: Droplets,
  },
  {
    id: "irrigation",
    title: "Use Efficient Irrigation",
    body:
      "Water crops during cooler hours and avoid over-irrigation. Drip or targeted irrigation can reduce water loss.",
    icon: Sprout,
  },
  {
    id: "soil",
    title: "Protect Soil Moisture",
    body:
      "Use mulch and organic matter where appropriate to reduce evaporation and help soil retain moisture.",
    icon: Leaf,
  },
  {
    id: "heat",
    title: "Reduce Heat Exposure",
    body:
      "During very hot conditions, avoid unnecessary outdoor activity in peak afternoon hours and keep drinking water available.",
    icon: Sun,
  },
  {
    id: "rain",
    title: "Store Rainwater Safely",
    body:
      "Where practical, collect rainfall for later non-drinking uses and protect stored water from contamination.",
    icon: CloudRain,
  },
  {
    id: "updates",
    title: "Follow Official Alerts",
    body:
      "Check AgriWatch and official PDMA advisories regularly when drought conditions begin to worsen.",
    icon: ShieldAlert,
  },
];

// ============================================================
// RISK-SPECIFIC ADVICE
// ============================================================

function getRiskAdvice(riskLevel) {
  switch (riskLevel) {
    case "Severe":
      return {
        title: "Severe drought precautions",
        body:
          "Drought risk is currently severe. Prioritize essential water use, avoid water wastage and closely follow official drought alerts.",
        icon: ShieldAlert,
      };

    case "High":
      return {
        title: "High drought precautions",
        body:
          "Drought risk is high. Reduce non-essential water use and monitor crops, soil moisture and local alerts closely.",
        icon: Activity,
      };

    case "Moderate":
      return {
        title: "Stay prepared",
        body:
          "Drought risk is moderate. Use water efficiently and continue monitoring local environmental conditions.",
        icon: Droplets,
      };

    default:
      return {
        title: "Maintain good water practices",
        body:
          "Current drought risk is relatively low, but continued water conservation helps protect supplies during future dry periods.",
        icon: Home,
      };
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Awareness() {
  const { t } = useLanguage();

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD REAL DISTRICT ML STATUS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadPrediction() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/predict-district/${encodeURIComponent(
            USER_DISTRICT
          )}`
        );

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => ({}));

          throw new Error(
            data.detail ||
              `Prediction request failed (${response.status})`
          );
        }

        const data = await response.json();

        console.log(
          "PUBLIC AWARENESS REAL ML DATA:",
          data
        );

        if (!data.success) {
          throw new Error(
            "Prediction data was not available."
          );
        }

        if (!cancelled) {
          setPrediction(data);
        }
      } catch (err) {
        console.error(
          "PUBLIC AWARENESS ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load current drought status."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPrediction();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // CURRENT RISK
  // ==========================================================

  const riskLevel =
    prediction?.risk_level || "Low";

  const probability = Number(
    prediction?.drought_probability_percent ?? 0
  );

  const riskAdvice = useMemo(
    () => getRiskAdvice(riskLevel),
    [riskLevel]
  );

  const RiskIcon = riskAdvice.icon;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t("ptPublicAwarenessTitle")}
        subtitle={`${USER_DISTRICT} — Drought awareness & water conservation`}
      />

      <main
        className="p-4 sm:p-8 space-y-6 public-page"
        dir="ltr"
      >
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">Community preparedness</span>
            <h2 className="public-hero-title">Drought awareness for {USER_DISTRICT}</h2>
            <p className="public-hero-copy">Practical water-saving guidance, local risk context, and simple actions households can take before drought conditions worsen.</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>Current risk</span><strong>{loading ? "Loading" : error ? "Unavailable" : riskLevel}</strong></div>
            <div className="public-hero-stat"><span>30-day risk</span><strong>{loading || error ? "—" : `${probability.toFixed(1)}%`}</strong></div>
            <div className="public-hero-stat"><span>Guidance</span><strong>6 key actions</strong></div>
          </div>
        </section>

        {/* CURRENT DISTRICT STATUS */}

        <Card scan className="public-data-card">
          {loading ? (
            <p className="text-sm text-ink/50">
              Loading current drought conditions...
            </p>
          ) : error ? (
            <div>
              <p className="font-medium">
                General drought awareness
              </p>

              <p className="text-sm text-ink/50 mt-1">
                Live district status could not be loaded.
                General conservation guidance is still available below.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  Current Regional Risk
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <SeverityBadge level={riskLevel} />

                  <span className="text-sm text-ink/50">
                    {prediction?.district}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase text-ink/40 font-medium">
                  30-Day Drought Risk
                </p>

                <p className="font-display text-2xl font-semibold mt-1">
                  {probability.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* RISK-SPECIFIC ADVICE */}

        {!loading && !error && (
          <Card className="public-callout">
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <RiskIcon
                  size={20}
                  className="text-primary"
                />
              </div>

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  Recommended For Current Conditions
                </p>

                <p className="font-display font-semibold mt-1">
                  {riskAdvice.title}
                </p>

                <p className="text-sm text-ink/60 mt-2 leading-relaxed">
                  {riskAdvice.body}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* GENERAL TIPS */}

        <div>
          <div className="mb-4">
            <p className="font-display font-semibold">
              Drought Preparedness & Water-Saving Tips
            </p>

            <p className="text-xs text-ink/40 mt-1">
              Practical guidance for households and communities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generalTips.map((tip) => {
              const Icon = tip.icon;

              return (
                <Card
                  key={tip.id}
                  className="public-action-card"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon
                      size={17}
                      className="text-primary"
                    />
                  </div>

                  <div>
                    <p className="font-medium text-sm">
                      {tip.title}
                    </p>

                    <p className="text-sm text-ink/55 mt-1 leading-relaxed">
                      {tip.body}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-ink/40">
          Drought risk shown above is generated from the
          AgriWatch Random Forest prediction service.
          Awareness guidance is informational and should be
          used alongside official PDMA and local authority
          advisories.
        </p>
      </main>
    </>
  );
}