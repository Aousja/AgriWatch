import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";
import { Link } from "react-router-dom";
import Card, { SeverityBadge } from "../../components/Card";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

import { getMapData } from "../../services/droughtService";


// ============================================================
// SEVERITY COLORS
// ============================================================

const severityColor = {
  Normal: "#2f8f2f",
  Moderate: "#f4b400",
  Severe: "#f06b3c",
  Extreme: "#d8432e",
};


// ============================================================
// TRANSLATION KEYS
// ============================================================

const sevKeyMap = {
  Normal: "sevNormal",
  Moderate: "sevModerate",
  Severe: "sevSevere",
  Extreme: "sevExtreme",
};


// ============================================================
// NORMALIZE SEVERITY
// Backend may return Low / Moderate / Severe etc.
// ============================================================

function normalizeSeverity(level, probability = 0) {
  const value = String(level || "").toLowerCase();

  if (
    value.includes("extreme") ||
    value.includes("critical")
  ) {
    return "Extreme";
  }

  if (
    value.includes("severe") ||
    value.includes("high")
  ) {
    return "Severe";
  }

  if (
    value.includes("moderate") ||
    value.includes("medium")
  ) {
    return "Moderate";
  }

  if (
    value.includes("normal") ||
    value.includes("low") ||
    value.includes("no drought")
  ) {
    return "Normal";
  }

  // Fallback using ML probability
  const p = Number(probability || 0);

  if (p >= 0.8) return "Extreme";
  if (p >= 0.6) return "Severe";
  if (p >= 0.3) return "Moderate";

  return "Normal";
}


// ============================================================
// NDVI COLOR
// ============================================================

function getNDVIColor(ndvi) {
  const value = Number(ndvi);

  if (!Number.isFinite(value)) {
    return "#9ca3af";
  }

  if (value < 0.1) {
    return "#d8432e";
  }

  if (value < 0.2) {
    return "#f06b3c";
  }

  if (value < 0.35) {
    return "#f4b400";
  }

  return "#2f8f2f";
}


// ============================================================
// SOIL MOISTURE COLOR
// ============================================================

function getSoilColor(soilMoisture) {
  const value = Number(soilMoisture);

  if (!Number.isFinite(value)) {
    return "#9ca3af";
  }

  /*
    Your API values appear to be fractions such as:
    0.1333

    Therefore:
    < 0.10 = very dry
    < 0.15 = dry
    < 0.20 = moderate
    >= 0.20 = good
  */

  if (value < 0.1) {
    return "#d8432e";
  }

  if (value < 0.15) {
    return "#f06b3c";
  }

  if (value < 0.2) {
    return "#f4b400";
  }

  return "#2f8f2f";
}


// ============================================================
// GET MARKER COLOR
// ============================================================

function getMarkerColor(district, layer) {
  if (layer === "ndvi") {
    return getNDVIColor(district.ndvi);
  }

  if (layer === "soilMoisture") {
    return getSoilColor(district.soilMoisture);
  }

  return severityColor[district.severity] || "#9ca3af";
}


// ============================================================
// SAFE NUMBER FORMATTER
// ============================================================

function formatNumber(value, digits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "N/A";
  }

  return number.toFixed(digits);
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DroughtMap() {

  const [layer, setLayer] = useState("severity");

  const [districts, setDistricts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const { t, lang } = useLanguage();


  // ==========================================================
  // LOAD REAL MAP DATA
  // ==========================================================

  useEffect(() => {

    let cancelled = false;

    async function loadMapData() {

      try {

        setLoading(true);
        setError("");

        const result = await getMapData();

        console.log(
          "REAL AGRIWATCH MAP DATA:",
          result
        );


        // ------------------------------------------------------
        // Support both:
        //
        // {
        //    districts: [...]
        // }
        //
        // OR directly [...]
        // ------------------------------------------------------

        const apiDistricts = Array.isArray(result)
          ? result
          : result?.districts || [];


        // ------------------------------------------------------
        // Normalize backend data
        // ------------------------------------------------------

        const cleanedDistricts = apiDistricts
          .map((item, index) => {

            const environmental =
              item.environmental_data || {};


            // Coordinates
            const latitude = Number(
              item.latitude ??
              item.lat
            );

            const longitude = Number(
              item.longitude ??
              item.lng
            );


            // ML probability
            const probability = Number(
              item.drought_probability ?? 0
            );


            // Environmental values
            const rainfall = Number(
              environmental.rainfall_mm ??
              item.rainfall_mm
            );

            const soilMoisture = Number(
              environmental.soil_moisture ??
              item.soil_moisture
            );

            const ndvi = Number(
              environmental.ndvi ??
              item.ndvi
            );

            const temperature = Number(
              environmental.temperature_c ??
              item.temperature_c
            );

            const evaporation = Number(
              environmental.evaporation_mm ??
              item.evaporation_mm
            );


            const severity = normalizeSeverity(
              item.risk_level,
              probability
            );


            return {

              id:
                item.id ??
                `${item.district}-${index}`,

              name:
                item.district ||
                item.name ||
                "Unknown District",

              province:
                item.province ||
                "Unknown",

              lat: latitude,

              lng: longitude,

              droughtProbability:
                probability,

              droughtPercent:
                Number(
                  item.drought_probability_percent ??
                  probability * 100
                ),

              predictedDrought:
                item.predicted_drought ?? 0,

              predictionStatus:
                item.prediction_status ||
                "Unknown",

              severity,

              rainfall,

              soilMoisture,

              ndvi,

              temperature,

              evaporation,

              dataDate:
                item.data_date || null,
            };

          })

          // Only plot districts with valid coordinates
          .filter(
            (district) =>
              Number.isFinite(district.lat) &&
              Number.isFinite(district.lng)
          );


        console.log(
          "MAP DISTRICTS:",
          cleanedDistricts.length
        );

        console.log(
          "FINAL REAL MAP DISTRICTS:",
          cleanedDistricts
        );


        if (!cancelled) {
          setDistricts(cleanedDistricts);
        }

      }

      catch (err) {

        console.error(
          "Map data loading error:",
          err
        );

        if (!cancelled) {

          setError(
            err?.message ||
            "Failed to load drought map data."
          );

        }

      }

      finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    }


    loadMapData();


    return () => {
      cancelled = true;
    };

  }, []);


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats = useMemo(() => {

    const result = {
      Normal: 0,
      Moderate: 0,
      Severe: 0,
      Extreme: 0,
    };


    districts.forEach((district) => {

      if (result[district.severity] !== undefined) {
        result[district.severity]++;
      }

    });


    return result;

  }, [districts]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <>
        <Topbar
          title={t("ptAdminMapTitle")}
          subtitle={t("ptAdminMapSub")}
        />

        <main className="p-4 sm:p-8">

          <Card>

            <div className="py-20 text-center">

              <p className="font-display font-semibold text-lg">
                Loading drought map...
              </p>

              <p className="text-sm text-ink/50 mt-2">
                Loading real ML predictions for Pakistan districts.
              </p>

            </div>

          </Card>

        </main>
      </>
    );

  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (
      <>
        <Topbar
          title={t("ptAdminMapTitle")}
          subtitle={t("ptAdminMapSub")}
        />

        <main className="p-4 sm:p-8">

          <Card>

            <div className="py-12">

              <p className="font-semibold text-red-600">
                Could not load drought map.
              </p>

              <p className="text-sm text-ink/60 mt-2">
                {error}
              </p>

              <p className="text-xs text-ink/40 mt-3">
                Make sure the FastAPI backend is running on
                http://127.0.0.1:8000
              </p>

            </div>

          </Card>

        </main>
      </>
    );

  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <>

      <Topbar
        title={t("ptAdminMapTitle")}
        subtitle={t("ptAdminMapSub")}
      />


      <main
        className="p-4 sm:p-8 space-y-5 pdma-page"
        dir="ltr"
      >
        <PdmaPageHero
          title="Operational drought map"
          copy="Explore district-level drought conditions across Pakistan and switch between severity, NDVI and soil-moisture views without leaving the PDMA workspace."
          stats={[
            { label: "Mapped districts", value: districts.length },
            { label: "High risk", value: districts.filter((d) => d.severity === "Severe" || d.severity === "Extreme").length },
            { label: "Active layer", value: layer === "soilMoisture" ? "Soil moisture" : layer.toUpperCase() },
          ]}
        />

        {/* ====================================================
            LAYER CONTROLS
        ==================================================== */}

        <div className="pdma-control-strip flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">


          <div className="flex flex-wrap gap-2">

            {[
              "severity",
              "ndvi",
              "soilMoisture",
            ].map((item) => (

              <button

                key={item}

                onClick={() =>
                  setLayer(item)
                }

                className={`
                  px-4
                  py-2
                  rounded-lg
                  text-xs
                  font-medium
                  border
                  transition-colors

                  ${
                    layer === item

                      ? "bg-forest text-white border-forest"

                      : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
                  }
                `}
              >

                {item === "severity"
                  ? "Severity"
                  : item === "ndvi"
                  ? "NDVI"
                  : "Soil Moisture"}

              </button>

            ))}

          </div>


          {/* ==================================================
              LEGEND
          ================================================== */}

          <div className="flex flex-wrap items-center gap-4 text-xs text-ink/50">


            {layer === "severity" &&

              Object.entries(
                severityColor
              ).map(([key, value]) => (

                <span

                  key={key}

                  dir={
                    lang === "ur"
                      ? "rtl"
                      : undefined
                  }

                  className={`
                    flex
                    items-center
                    gap-1.5

                    ${
                      lang === "ur"
                        ? "i18n-ur"
                        : ""
                    }
                  `}
                >

                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{
                      background: value,
                    }}
                  />

                  {t(sevKeyMap[key])}

                </span>

              ))
            }


            {layer === "ndvi" && (
              <>
                <LegendDot
                  color="#d8432e"
                  text="< 0.10 Very Low"
                />

                <LegendDot
                  color="#f06b3c"
                  text="0.10–0.20 Low"
                />

                <LegendDot
                  color="#f4b400"
                  text="0.20–0.35 Moderate"
                />

                <LegendDot
                  color="#2f8f2f"
                  text="≥ 0.35 Healthy"
                />
              </>
            )}


            {layer === "soilMoisture" && (
              <>
                <LegendDot
                  color="#d8432e"
                  text="< 0.10 Very Dry"
                />

                <LegendDot
                  color="#f06b3c"
                  text="0.10–0.15 Dry"
                />

                <LegendDot
                  color="#f4b400"
                  text="0.15–0.20 Moderate"
                />

                <LegendDot
                  color="#2f8f2f"
                  text="≥ 0.20 Good"
                />
              </>
            )}

          </div>

        </div>


        {/* ====================================================
            MAP
        ==================================================== */}

        <Card className="pdma-map-shell p-0 overflow-hidden">

          <MapContainer

            center={[
              30.3753,
              69.3451,
            ]}

            zoom={5}

            minZoom={4}

            maxZoom={12}

            style={{
              height: "600px",
              width: "100%",
            }}

          >


            {/* ================================================
                FREE OPENSTREETMAP
                NO API KEY
            ================================================ */}

            <TileLayer

              attribution="&copy; OpenStreetMap contributors"

              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

            />


            {/* ================================================
                ALL REAL DISTRICT MARKERS
            ================================================ */}

            {districts.map((district) => {

              const markerColor =
                getMarkerColor(
                  district,
                  layer
                );


              return (

                <CircleMarker

                  key={district.id}

                  center={[
                    district.lat,
                    district.lng,
                  ]}

                  radius={10}

                  pathOptions={{

                    color:
                      markerColor,

                    fillColor:
                      markerColor,

                    fillOpacity:
                      0.65,

                    weight: 2,

                  }}

                >


                  <Popup>

                    <div
                      className="font-body text-sm"
                      style={{
                        minWidth: "230px",
                      }}
                    >


                      {/* DISTRICT */}

                      <p className="font-semibold text-base">

                        {district.name}

                      </p>


                      <p className="text-xs text-gray-500 mb-3">

                        {district.province}

                      </p>


                      {/* ML RESULT */}

                      <div className="space-y-1">

                        <p>
                          <strong>
                            Drought Risk:
                          </strong>{" "}

                          {formatNumber(
                            district.droughtPercent,
                            2
                          )}
                          %
                        </p>


                        <p>
                          <strong>
                            Severity:
                          </strong>{" "}

                          {district.severity}
                        </p>


                        <p>
                          <strong>
                            Status:
                          </strong>{" "}

                          {
                            district.predictionStatus
                          }
                        </p>

                      </div>


                      <hr className="my-2" />


                      {/* ENVIRONMENT */}

                      <div className="space-y-1">

                        <p>
                          <strong>
                            Rainfall:
                          </strong>{" "}

                          {formatNumber(
                            district.rainfall
                          )}{" "}
                          mm
                        </p>


                        <p>
                          <strong>
                            Soil Moisture:
                          </strong>{" "}

                          {formatNumber(
                            district.soilMoisture,
                            4
                          )}
                        </p>


                        <p>
                          <strong>
                            NDVI:
                          </strong>{" "}

                          {formatNumber(
                            district.ndvi,
                            4
                          )}
                        </p>


                        <p>
                          <strong>
                            Temperature:
                          </strong>{" "}

                          {formatNumber(
                            district.temperature
                          )}
                          °C
                        </p>


                        <p>
                          <strong>
                            Evaporation:
                          </strong>{" "}

                          {formatNumber(
                            district.evaporation
                          )}{" "}
                          mm
                        </p>

                      </div>


                      {district.dataDate && (
                        <p className="text-xs text-gray-400 mt-2">
                          Data date:{" "}
                          {district.dataDate}
                        </p>
                      )}


                      <Link

                        to={`/admin/district/${district.id}`}

                        className="
                          text-primary
                          text-xs
                          font-medium
                          hover:underline
                          mt-3
                          inline-block
                        "
                      >

                        View full details →

                      </Link>


                    </div>

                  </Popup>

                </CircleMarker>

              );

            })}

          </MapContainer>

        </Card>


        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">

            <div>

              <p className="font-display font-semibold">

                Pakistan District Drought Summary

              </p>

              <p className="text-xs text-ink/40 mt-1">

                Real Random Forest predictions from the AgriWatch API

              </p>

            </div>


            <div className="text-xs text-ink/50">

              {districts.length} districts loaded

            </div>

          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">


            <SummaryCard
              title="Normal"
              count={stats.Normal}
              color={
                severityColor.Normal
              }
            />


            <SummaryCard
              title="Moderate"
              count={stats.Moderate}
              color={
                severityColor.Moderate
              }
            />


            <SummaryCard
              title="Severe"
              count={stats.Severe}
              color={
                severityColor.Severe
              }
            />


            <SummaryCard
              title="Extreme"
              count={stats.Extreme}
              color={
                severityColor.Extreme
              }
            />


          </div>

        </Card>


        {/* ====================================================
            DISTRICT LIST
        ==================================================== */}

        <Card>

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="font-display font-semibold">

                Districts

              </p>

              <p className="text-xs text-ink/40 mt-1">

                Select a district to view complete details

              </p>

            </div>

          </div>


          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">


            {districts.map((district) => (

              <Link

                to={`/admin/district/${district.id}`}

                key={district.id}

                className="
                  btn-animated
                  border
                  border-line
                  rounded-lg
                  p-3
                  block
                  hover:border-primary/40
                  transition-colors
                "
              >


                <p className="text-sm font-medium">

                  {district.name}

                </p>


                <p className="text-xs text-ink/40 mb-2">

                  {district.province}

                </p>


                <div className="flex items-center justify-between gap-2">

                  <SeverityBadge
                    level={
                      district.severity
                    }
                  />


                  <span className="text-xs font-medium">

                    {formatNumber(
                      district.droughtPercent,
                      1
                    )}
                    %

                  </span>

                </div>


              </Link>

            ))}


          </div>

        </Card>


      </main>

    </>
  );

}


// ============================================================
// LEGEND COMPONENT
// ============================================================

function LegendDot({
  color,
  text,
}) {

  return (

    <span className="flex items-center gap-1.5">

      <span
        className="w-2.5 h-2.5 rounded-full inline-block"
        style={{
          background: color,
        }}
      />

      {text}

    </span>

  );

}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  count,
  color,
}) {

  return (

    <div className="border border-line rounded-xl p-4">

      <div className="flex items-center gap-2">

        <span
          className="w-3 h-3 rounded-full"
          style={{
            background: color,
          }}
        />

        <p className="text-sm text-ink/60">

          {title}

        </p>

      </div>


      <p className="text-2xl font-display font-semibold mt-2">

        {count}

      </p>


      <p className="text-xs text-ink/40 mt-1">

        districts

      </p>

    </div>

  );

}