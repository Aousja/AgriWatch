import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

import Card, {
  StatCard,
  SeverityBadge,
} from "../../components/Card";

import {
  SkeletonStatCard,
  SkeletonTableRows,
} from "../../components/Skeleton";

import RangeToggle from "../../components/RangeToggle";

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
  MapPinned,
  Radio,
  Droplets,
} from "lucide-react";

import {
  getMapData,
  getNationalHistory,
} from "../../services/droughtService";


// ============================================================
// HELPERS
// ============================================================

function normalizeSeverity(level, probability = 0) {
  const value = String(level || "").toLowerCase();
  const p = Number(probability || 0);

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

  // Fallback from ML probability
  if (p >= 0.8) return "Extreme";
  if (p >= 0.6) return "Severe";
  if (p >= 0.3) return "Moderate";

  return "Normal";
}


function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function formatNumber(value, digits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "N/A";
  }

  return number.toFixed(digits);
}


// Format API month:
//
// 2025-09 -> Sep 25
// 2026-08 -> Aug 26

function formatMonth(value) {
  if (!value) return "";

  const [year, month] = String(value).split("-");

  const yearNumber = Number(year);
  const monthNumber = Number(month);

  if (
    !Number.isFinite(yearNumber) ||
    !Number.isFinite(monthNumber)
  ) {
    return value;
  }

  const date = new Date(
    yearNumber,
    monthNumber - 1,
    1
  );

  return date.toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}


// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [range, setRange] = useState("6mo");

  // Current district ML data
  const [districts, setDistricts] = useState([]);

  // Real national historical data
  const [nationalHistory, setNationalHistory] =
    useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(true);

  // Error states
  const [error, setError] = useState("");
  const [historyError, setHistoryError] =
    useState("");


  // ==========================================================
  // LOAD CURRENT REAL ML DISTRICT DATA
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const result = await getMapData();

        console.log(
          "REAL AGRIWATCH OVERVIEW DATA:",
          result
        );

        const apiDistricts = Array.isArray(result)
          ? result
          : result?.districts || [];

        const cleaned = apiDistricts.map(
          (item, index) => {
            const environmental =
              item.environmental_data || {};

            const probability = safeNumber(
              item.drought_probability
            );

            const percent = safeNumber(
              item.drought_probability_percent,
              probability * 100
            );

            const ndvi = safeNumber(
              environmental.ndvi ??
                item.ndvi
            );

            const soilMoisture = safeNumber(
              environmental.soil_moisture ??
                item.soil_moisture
            );

            const rainfall = safeNumber(
              environmental.rainfall_mm ??
                item.rainfall_mm
            );

            const temperature = safeNumber(
              environmental.temperature_c ??
                item.temperature_c
            );

            const evaporation = safeNumber(
              environmental.evaporation_mm ??
                item.evaporation_mm
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

              droughtProbability:
                probability,

              droughtPercent:
                percent,

              predictedDrought:
                item.predicted_drought ?? 0,

              predictionStatus:
                item.prediction_status ||
                "Unknown",

              severity: normalizeSeverity(
                item.risk_level,
                probability
              ),

              ndvi,

              soilMoisture,

              rainfall,

              temperature,

              evaporation,

              dataDate:
                item.data_date || null,
            };
          }
        );

        if (!cancelled) {
          setDistricts(cleaned);
        }

        console.log(
          "OVERVIEW DISTRICTS:",
          cleaned.length
        );

      } catch (err) {
        console.error(
          "Overview API error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load overview data."
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);


  // ==========================================================
  // LOAD REAL NATIONAL 12-MONTH HISTORY
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadNationalHistory() {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const result =
          await getNationalHistory();

        console.log(
          "REAL AGRIWATCH NATIONAL HISTORY:",
          result
        );

        const history =
          Array.isArray(result)
            ? result
            : result?.history || [];

        const cleanedHistory = history.map(
          (item) => {
            const ndvi =
              safeNumber(item.ndvi);

            const soilMoisture =
              safeNumber(
                item.soil_moisture ??
                  item.soilMoisture
              );

            return {
              month:
                item.month || "",

              // Convert NDVI to 0-100
              // for chart readability.
              ndvi: Number(
                (ndvi * 100).toFixed(2)
              ),

              // Backend returns fraction:
              // 0.1909 -> 19.09%
              soilMoisture: Number(
                (soilMoisture * 100).toFixed(2)
              ),

              districts:
                safeNumber(
                  item.districts,
                  0
                ),
            };
          }
        );

        if (!cancelled) {
          setNationalHistory(
            cleanedHistory
          );
        }

        console.log(
          "NATIONAL HISTORY RECORDS:",
          cleanedHistory.length
        );

      } catch (err) {
        console.error(
          "National history API error:",
          err
        );

        if (!cancelled) {
          setHistoryError(
            err?.message ||
              "Failed to load national history."
          );
        }

      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    loadNationalHistory();

    return () => {
      cancelled = true;
    };
  }, []);


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats = useMemo(() => {
    const extreme = districts.filter(
      (d) => d.severity === "Extreme"
    ).length;

    const severe = districts.filter(
      (d) => d.severity === "Severe"
    ).length;

    const moderate = districts.filter(
      (d) => d.severity === "Moderate"
    ).length;

    const normal = districts.filter(
      (d) => d.severity === "Normal"
    ).length;

    const activeWarnings = districts.filter(
      (d) =>
        d.predictedDrought === 1 ||
        d.droughtProbability >= 0.2
    ).length;

    return {
      extreme,
      severe,
      moderate,
      normal,
      activeWarnings,
    };
  }, [districts]);


  // ==========================================================
  // HIGHEST-RISK DISTRICTS
  // ==========================================================

  const alerts = useMemo(() => {
    return [...districts]
      .filter(
        (district) =>
          district.predictedDrought === 1 ||
          district.droughtProbability >= 0.2
      )
      .sort(
        (a, b) =>
          b.droughtProbability -
          a.droughtProbability
      )
      .slice(0, 4)
      .map((district) => {
        let message =
          `ML drought probability ${district.droughtPercent.toFixed(
            1
          )}%.`;

        if (
          district.severity === "Extreme"
        ) {
          message =
            `Extreme drought risk detected. ML probability ${district.droughtPercent.toFixed(
              1
            )}%.`;

        } else if (
          district.severity === "Severe"
        ) {
          message =
            `Severe drought conditions predicted. ML probability ${district.droughtPercent.toFixed(
              1
            )}%.`;

        } else if (
          district.severity === "Moderate"
        ) {
          message =
            `Moderate drought risk detected. ML probability ${district.droughtPercent.toFixed(
              1
            )}%.`;
        }

        return {
          ...district,
          message,
        };
      });

  }, [districts]);


  // ==========================================================
  // REAL NATIONAL CHART DATA
  // ==========================================================

  const chartData = useMemo(() => {
    if (!nationalHistory.length) {
      return [];
    }

    if (range === "6mo") {
      return nationalHistory.slice(-6);
    }

    return nationalHistory.slice(-12);

  }, [nationalHistory, range]);


  // ==========================================================
  // DISTRICTS AT A GLANCE
  // ==========================================================

  const tableDistricts = useMemo(() => {
    return [...districts]
      .sort(
        (a, b) =>
          b.droughtProbability -
          a.droughtProbability
      )
      .slice(0, 12);

  }, [districts]);


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t("ptAdminOverviewTitle")}
        subtitle={t("ptAdminOverviewSub")}
      />

      <main
        className="p-4 sm:p-8 space-y-6 pdma-page"
        dir="ltr"
      >
        <PdmaPageHero
          title="National drought overview"
          copy="Monitor Pakistan-wide ML drought severity, warning signals and environmental trends from one operational dashboard."
          stats={!loading ? [
            { label: "Districts monitored", value: districts.length },
            { label: "Extreme districts", value: stats.extreme },
            { label: "Active warnings", value: stats.activeWarnings },
          ] : []}
          right={<span className="pdma-hero-button">{range === "6mo" ? "Last 6 months" : "Last 12 months"}</span>}
        />

        {/* ====================================================
            CURRENT ML DATA ERROR
        ==================================================== */}

        {error && (
          <Card>
            <div className="text-sm">

              <p className="font-semibold text-red-600">
                Could not load live ML overview.
              </p>

              <p className="text-ink/50 mt-1">
                {error}
              </p>

              <p className="text-xs text-ink/40 mt-2">
                Make sure the FastAPI backend is running.
              </p>

            </div>
          </Card>
        )}


        {/* ====================================================
            STAT CARDS
        ==================================================== */}

        {loading ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <SkeletonStatCard />

            <SkeletonStatCard />

            <SkeletonStatCard />

            <SkeletonStatCard />

          </div>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <StatCard
              label="Districts Monitored"
              value={districts.length}
              icon={MapPinned}
              delta="All Pakistan"
              deltaTone="ok"
            />

            <StatCard
              label="Extreme Drought"
              value={stats.extreme}
              icon={AlertTriangle}
              delta="Current ML classification"
              deltaTone="danger"
            />

            <StatCard
              label="Severe Drought"
              value={stats.severe}
              icon={Droplets}
              delta="Current ML classification"
              deltaTone="warn"
            />

            <StatCard
              label="Active Warnings"
              value={stats.activeWarnings}
              icon={Radio}
              delta="ML warning threshold"
              deltaTone="ok"
            />

          </div>
        )}


        {/* ====================================================
            NATIONAL HISTORY + HIGHEST RISK
        ==================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


          {/* ==================================================
              REAL NATIONAL HISTORY
          ================================================== */}

          <Card className="lg:col-span-2">

            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">

              <div>

                <p className="font-display font-semibold">
                  National NDVI &amp; Soil Moisture
                </p>

                <p className="text-xs text-ink/40 font-mono">
                  Real national monthly averages from{" "}
                  {districts.length || 119} districts
                </p>

              </div>


              <RangeToggle
                range={range}
                setRange={setRange}
              />

            </div>


            {/* HISTORY ERROR */}

            {historyError && (

              <div className="h-[240px] flex flex-col items-center justify-center text-center">

                <p className="text-sm font-medium text-red-600">
                  Could not load national history.
                </p>

                <p className="text-xs text-ink/40 mt-1">
                  {historyError}
                </p>

              </div>

            )}


            {/* HISTORY LOADING */}

            {!historyError &&
              historyLoading && (

                <div className="h-[240px] flex items-center justify-center text-sm text-ink/40">
                  Loading national history...
                </div>

              )}


            {/* EMPTY HISTORY */}

            {!historyError &&
              !historyLoading &&
              chartData.length === 0 && (

                <div className="h-[240px] flex items-center justify-center text-sm text-ink/40">
                  No national historical data available.
                </div>

              )}


            {/* REAL CHART */}

            {!historyError &&
              !historyLoading &&
              chartData.length > 0 && (

                <ResponsiveContainer
                  width="100%"
                  height={240}
                >

                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >

                    <defs>

                      <linearGradient
                        id="ndvi"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="#3F8C2C"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="95%"
                          stopColor="#3F8C2C"
                          stopOpacity={0}
                        />

                      </linearGradient>


                      <linearGradient
                        id="soil"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="#F2C230"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="95%"
                          stopColor="#F2C230"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>


                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#DCE1D3"
                      vertical={false}
                    />


                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      tick={{
                        fontSize: 12,
                        fill: "#12160F99",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />


                    <YAxis
                      domain={[0, 100]}
                      tick={{
                        fontSize: 12,
                        fill: "#12160F99",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) =>
                        `${value}%`
                      }
                    />


                    <Tooltip
                      labelFormatter={(label) =>
                        formatMonth(label)
                      }
                      formatter={(value, name) => [
                        `${Number(value).toFixed(
                          2
                        )}%`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border:
                          "1px solid #DCE1D3",
                        fontSize: 12,
                      }}
                    />


                    <Area
                      type="monotone"
                      dataKey="ndvi"
                      stroke="#3F8C2C"
                      fill="url(#ndvi)"
                      strokeWidth={2}
                      name="NDVI × 100"
                      dot={{
                        r: 2,
                      }}
                      activeDot={{
                        r: 4,
                      }}
                    />


                    <Area
                      type="monotone"
                      dataKey="soilMoisture"
                      stroke="#F2C230"
                      fill="url(#soil)"
                      strokeWidth={2}
                      name="Soil Moisture"
                      dot={{
                        r: 2,
                      }}
                      activeDot={{
                        r: 4,
                      }}
                    />

                  </AreaChart>

                </ResponsiveContainer>

              )}

          </Card>


          {/* ==================================================
              HIGHEST RISK DISTRICTS
          ================================================== */}

          <Card>

            <div className="mb-4">

              <p className="font-display font-semibold">
                Highest Risk Districts
              </p>

              <p className="text-xs text-ink/40 mt-1">
                Current Random Forest results
              </p>

            </div>


            {loading ? (

              <div className="space-y-4">

                <SkeletonTableRows
                  rows={4}
                  cols={2}
                />

              </div>

            ) : alerts.length === 0 ? (

              <p className="text-sm text-ink/50">
                No active drought warnings.
              </p>

            ) : (

              <div className="space-y-3">

                {alerts.map((alert) => (

                  <div
                    key={alert.id}
                    onClick={() =>
                      navigate(
                        `/admin/district/${alert.id}`
                      )
                    }
                    className="flex items-start gap-3 pb-3 border-b border-line last:border-0 last:pb-0 cursor-pointer hover:bg-paper-dim/50 rounded-md p-1"
                  >

                    <div className="mt-1">

                      <SeverityBadge
                        level={alert.severity}
                      />

                    </div>


                    <div className="min-w-0">

                      <p className="text-sm font-medium truncate">
                        {alert.name}
                      </p>

                      <p className="text-xs text-ink/45 line-clamp-2">
                        {alert.message}
                      </p>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </Card>

        </div>


        {/* ====================================================
            DISTRICTS AT A GLANCE
        ==================================================== */}

        <Card>

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="font-display font-semibold">
                Districts at a Glance
              </p>

              <p className="text-xs text-ink/40 mt-1">
                Highest current ML drought risk
              </p>

            </div>


            {!loading && (

              <span className="text-xs text-ink/40">
                {districts.length} monitored
              </span>

            )}

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">

                  <th className="pb-2 font-medium">
                    District
                  </th>

                  <th className="pb-2 font-medium">
                    Province
                  </th>

                  <th className="pb-2 font-medium">
                    NDVI
                  </th>

                  <th className="pb-2 font-medium">
                    Drought Risk
                  </th>

                  <th className="pb-2 font-medium">
                    Soil Moisture
                  </th>

                  <th className="pb-2 font-medium">
                    Severity
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <SkeletonTableRows
                    rows={6}
                    cols={6}
                  />

                ) : tableDistricts.length === 0 ? (

                  <tr>

                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-ink/40"
                    >
                      No district data available.
                    </td>

                  </tr>

                ) : (

                  tableDistricts.map(
                    (district) => (

                      <tr
                        key={district.id}
                        onClick={() =>
                          navigate(
                            `/admin/district/${district.id}`
                          )
                        }
                        className="border-b border-line last:border-0 hover:bg-paper-dim/60 cursor-pointer"
                      >

                        <td className="py-2.5 font-medium">
                          {district.name}
                        </td>


                        <td className="py-2.5 text-ink/60">
                          {district.province}
                        </td>


                        <td className="py-2.5 font-mono text-ink/70">
                          {formatNumber(
                            district.ndvi,
                            4
                          )}
                        </td>


                        <td className="py-2.5 font-mono font-medium">
                          {formatNumber(
                            district.droughtPercent,
                            2
                          )}
                          %
                        </td>


                        <td className="py-2.5 font-mono text-ink/70">
                          {formatNumber(
                            district.soilMoisture,
                            4
                          )}
                        </td>


                        <td className="py-2.5">

                          <SeverityBadge
                            level={
                              district.severity
                            }
                          />

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </Card>

      </main>
    </>
  );
}