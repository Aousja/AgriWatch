import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import Card from "../components/Card";
import logo from "../assets/logo.jpeg";

import {
  Lock,
  ArrowRight,
} from "lucide-react";

import { addRipple } from "../utils/ripple";

import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";

// ============================================================
// BACKEND
// ============================================================

const API_BASE = import.meta.env.VITE_API_URL || "https://agri-watch-backend.vercel.app";

// ============================================================
// MAJOR DISTRICTS SHOWN ON GUEST MAP
//
// IMPORTANT:
// All districts returned by /map-data are still monitored.
// These names only control which markers are displayed
// on the simplified guest national map.
// ============================================================

const MAJOR_DISTRICTS = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Faisalabad",
  "Multan",
  "Karachi",
  "Hyderabad",
  "Sukkur",
  "Peshawar",
  "Quetta",
];

// ============================================================
// RISK COLORS
// ============================================================

const RISK_COLORS = {
  Low: "#2f8f2f",
  Moderate: "#d9a300",
  High: "#e67e22",
  Severe: "#c73b22",
};

// ============================================================
// NORMALIZE DISTRICT
//
// Makes:
// Peshawar
// Peshawar District
//
// match correctly.
// ============================================================

function normalizeDistrict(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+district$/, "");
}

// ============================================================
// NORMALIZE PROVINCE
// ============================================================

function normalizeProvince(value) {
  const province = String(value || "").trim();

  const mapping = {
    "North-West Frontier": "Khyber Pakhtunkhwa",
    NWFP: "Khyber Pakhtunkhwa",
    KPK: "Khyber Pakhtunkhwa",
    KP: "Khyber Pakhtunkhwa",
  };

  return mapping[province] || province;
}

// ============================================================
// GET PROBABILITY
// ============================================================

function getProbability(district) {
  if (
    district?.drought_probability_percent !== undefined &&
    district?.drought_probability_percent !== null
  ) {
    return Number(
      district.drought_probability_percent
    );
  }

  if (
    district?.drought_probability !== undefined &&
    district?.drought_probability !== null
  ) {
    return (
      Number(district.drought_probability) * 100
    );
  }

  return 0;
}

// ============================================================
// FORMAT DATE
// ============================================================

function formatUpdateDate(value) {
  if (!value) {
    return "Latest satellite data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function GuestDashboard() {
  const { t, lang } = useLanguage();

  const [districts, setDistricts] = useState([]);
  const [latestDate, setLatestDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD ALL REAL ML DISTRICTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadNationalData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/map-data`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({}));

          throw new Error(
            errorData.detail ||
              errorData.error ||
              `Map request failed (${response.status})`
          );
        }

        const data = await response.json();

        console.log(
          "GUEST DASHBOARD REAL ML DATA:",
          data
        );

        if (!data.success) {
          throw new Error(
            data.error ||
              "Unable to load national drought data."
          );
        }

        const realDistricts =
          Array.isArray(data.districts)
            ? data.districts
            : [];

        if (!realDistricts.length) {
          throw new Error(
            "No district ML data was returned."
          );
        }

        if (!cancelled) {
          setDistricts(realDistricts);

          // Support possible backend date fields.
          setLatestDate(
            data.latest_date ||
              data.data_date ||
              data.updated_at ||
              ""
          );
        }
      } catch (err) {
        console.error(
          "GUEST DASHBOARD ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load national drought data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNationalData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // NATIONAL STATISTICS
  //
  // IMPORTANT:
  // These use ALL districts returned by the ML backend.
  // ==========================================================

  const nationalStats = useMemo(() => {
    const monitored = districts.length;

    const severe = districts.filter(
      (district) =>
        String(
          district.risk_level || ""
        ).toLowerCase() === "severe"
    ).length;

    const high = districts.filter(
      (district) =>
        String(
          district.risk_level || ""
        ).toLowerCase() === "high"
    ).length;

    const moderate = districts.filter(
      (district) =>
        String(
          district.risk_level || ""
        ).toLowerCase() === "moderate"
    ).length;

    const low = districts.filter(
      (district) =>
        String(
          district.risk_level || ""
        ).toLowerCase() === "low"
    ).length;

    return {
      monitored,
      severe,
      high,
      moderate,
      low,
    };
  }, [districts]);

  // ==========================================================
  // ONLY 10 MAJOR DISTRICTS FOR MAP
  // ==========================================================

  const mapDistricts = useMemo(() => {
    if (!districts.length) {
      return [];
    }

    const selected = [];

    for (const majorName of MAJOR_DISTRICTS) {
      const wanted =
        normalizeDistrict(majorName);

      const match = districts.find(
        (district) =>
          normalizeDistrict(
            district.district
          ) === wanted
      );

      if (match) {
        selected.push(match);
      }
    }

    console.log(
      "GUEST MAP MAJOR DISTRICTS:",
      selected
    );

    return selected;
  }, [districts]);

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div
      dir={lang === "ur" ? "rtl" : undefined}
      className={`min-h-screen bg-paper ${
        lang === "ur" ? "i18n-ur" : ""
      }`}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-line bg-surface px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <img
            src={logo}
            alt="AgriWatch Pakistan"
            className="w-9 h-9 rounded-full object-cover"
          />

          <span className="font-display font-semibold text-sm">
            AgriWatch{" "}
            <span className="text-ink/40 font-normal">
              · {t("guestView")}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <LanguageToggle />

          <Link
            to="/login"
            className="text-sm font-medium text-ink/60 hover:text-ink"
          >
            {t("login")}
          </Link>

          <Link
            to="/login"
            onMouseDown={addRipple}
            className="btn-animated bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-light transition-colors"
          >
            {t("registerFree")}
          </Link>
        </div>
      </header>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">

        {/* ====================================================
            NATIONAL OVERVIEW
        ==================================================== */}

        <Card className="bg-forest text-mist border-0 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-light">
              {t("publicPreview")}
            </p>

            <p className="font-display text-lg font-semibold mt-1">
              {t("nationalOverview")}
            </p>

            {!loading && !error && (
              <p className="text-xs text-mist/60 mt-1">
                National drought monitoring powered by
                AgriWatch Random Forest ML
              </p>
            )}
          </div>

          <Link
            to="/login"
            onMouseDown={addRipple}
            className="btn-animated flex items-center gap-1.5 text-sm font-medium bg-surface text-forest px-4 py-2 rounded-lg"
          >
            {t("registerForAlerts")}

            <ArrowRight
              size={14}
              className="rtl:rotate-180"
            />
          </Link>
        </Card>

        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (
          <Card>
            <p className="text-sm text-ink/50">
              Loading national AgriWatch ML data...
            </p>
          </Card>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {!loading && error && (
          <Card>
            <p className="font-display font-semibold">
              Unable to load national drought data
            </p>

            <p className="text-sm text-ink/50 mt-2">
              {error}
            </p>
          </Card>
        )}

        {/* ====================================================
            REAL NATIONAL SUMMARY
        ==================================================== */}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* DISTRICTS MONITORED */}

              <Card>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  {t("districtsMonitored")}
                </p>

                <p className="font-display text-2xl font-semibold mt-1">
                  {nationalStats.monitored}
                </p>

                <p className="text-xs text-ink/35 mt-1">
                  ML monitored districts
                </p>
              </Card>

              {/* SEVERE DISTRICTS */}

              <Card>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  {t("extremeDistricts")}
                </p>

                <p className="font-display text-2xl font-semibold mt-1 text-danger">
                  {nationalStats.severe}
                </p>

                <p className="text-xs text-ink/35 mt-1">
                  Severe drought risk
                </p>
              </Card>

              {/* LAST UPDATED */}

              <Card>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  {t("lastUpdated")}
                </p>

                <p className="font-display text-lg font-semibold mt-1">
                  {latestDate
                    ? formatUpdateDate(
                        latestDate
                      )
                    : "Latest ML data"}
                </p>

                <p className="text-xs text-ink/35 mt-1">
                  Satellite/environmental dataset
                </p>
              </Card>
            </div>

            {/* =================================================
                MAP INFORMATION
            ================================================= */}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-display font-semibold">
                  Pakistan Drought Risk Overview
                </p>

                <p className="text-xs text-ink/40 mt-1">
                  Showing {mapDistricts.length} major districts
                  from {nationalStats.monitored} monitored districts.
                </p>
              </div>

              {/* LEGEND */}

              <div className="flex items-center flex-wrap gap-4 text-xs text-ink/50">
                {Object.entries(
                  RISK_COLORS
                ).map(
                  ([level, color]) => (
                    <span
                      key={level}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            color,
                        }}
                      />

                      {level}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* =================================================
                REAL MAP
            ================================================= */}

            <Card className="p-0 overflow-hidden">
              <MapContainer
                center={[
                  30.3753,
                  69.3451,
                ]}
                zoom={5}
                minZoom={4}
                maxZoom={12}
                scrollWheelZoom={true}
                style={{
                  height: "500px",
                  width: "100%",
                  zIndex: 1,
                }}
              >
                {/* =============================================
                    FREE OPENSTREETMAP

                    No CARTO
                    No API key
                ============================================= */}

                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                  maxZoom={19}
                />

                {/* =============================================
                    ONLY MAJOR DISTRICTS
                    BUT REAL ML DATA
                ============================================= */}

                {mapDistricts.map(
                  (district) => {
                    const risk =
                      district.risk_level ||
                      "Low";

                    const color =
                      RISK_COLORS[risk] ||
                      "#64748b";

                    const probability =
                      getProbability(
                        district
                      );

                    const province =
                      normalizeProvince(
                        district.province
                      );

                    const latitude =
                      Number(
                        district.latitude
                      );

                    const longitude =
                      Number(
                        district.longitude
                      );

                    if (
                      !Number.isFinite(
                        latitude
                      ) ||
                      !Number.isFinite(
                        longitude
                      )
                    ) {
                      return null;
                    }

                    return (
                      <CircleMarker
                        key={`${province}-${district.district}`}
                        center={[
                          latitude,
                          longitude,
                        ]}
                        radius={12}
                        pathOptions={{
                          color,
                          fillColor:
                            color,
                          fillOpacity: 0.7,
                          weight: 2.5,
                        }}
                      >
                        <Popup>
                          <div className="font-body text-sm min-w-[190px]">
                            <p className="font-semibold">
                              {
                                district.district
                              }
                            </p>

                            <p className="text-xs text-gray-500">
                              {province}
                            </p>

                            <div className="mt-2 space-y-1">
                              <p>
                                Risk:{" "}
                                <strong>
                                  {risk}
                                </strong>
                              </p>

                              <p>
                                Drought probability:{" "}
                                <strong>
                                  {probability.toFixed(
                                    2
                                  )}
                                  %
                                </strong>
                              </p>

                              {district.data_date && (
                                <p className="text-xs text-gray-500">
                                  Data:{" "}
                                  {
                                    district.data_date
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  }
                )}
              </MapContainer>
            </Card>

            {/* =================================================
                NATIONAL BREAKDOWN
            ================================================= */}

            <Card>
              <p className="font-display font-semibold">
                National Risk Distribution
              </p>

              <p className="text-xs text-ink/40 mt-1 mb-4">
                Calculated from all {nationalStats.monitored} ML-monitored districts,
                not only the districts displayed on the map.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

                <div>
                  <p className="text-xs uppercase text-ink/40">
                    Low
                  </p>

                  <p className="font-display text-xl font-semibold mt-1">
                    {nationalStats.low}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-ink/40">
                    Moderate
                  </p>

                  <p className="font-display text-xl font-semibold mt-1">
                    {nationalStats.moderate}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-ink/40">
                    High
                  </p>

                  <p className="font-display text-xl font-semibold mt-1">
                    {nationalStats.high}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-ink/40">
                    Severe
                  </p>

                  <p className="font-display text-xl font-semibold text-danger mt-1">
                    {nationalStats.severe}
                  </p>
                </div>

              </div>
            </Card>
          </>
        )}

        {/* ====================================================
            LOCKED FEATURES
        ==================================================== */}

        <Card className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-lg bg-paper-dim flex items-center justify-center shrink-0">
              <Lock
                size={16}
                className="text-ink/40"
              />
            </div>

            <div>
              <p className="text-sm font-medium">
                {t("lockedFeatureText")}
              </p>

              <p className="text-xs text-ink/45 mt-0.5">
                {t("lockedFeatureSub")}
              </p>
            </div>
          </div>

          <Link
            to="/login"
            className="text-sm font-medium text-primary hover:underline shrink-0"
          >
            {t("registerNow")} →
          </Link>
        </Card>
      </main>
    </div>
  );
}