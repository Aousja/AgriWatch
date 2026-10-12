import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import { useEffect, useState } from "react";

import {
  getDistricts,
  predictDistrict,
  getDistrictHistory,
} from "../../services/droughtService";


export default function Predictions() {
  const { t } = useLanguage();

  // ============================================================
  // STATE
  // ============================================================

  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState("");

  // Current/latest ML prediction
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);

  // District list
  const [districtLoading, setDistrictLoading] = useState(true);

  // Historical ML predictions
  const [districtHistory, setDistrictHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);


  // ============================================================
  // LOAD REAL DISTRICTS
  // ============================================================

  useEffect(() => {
    async function loadDistricts() {
      try {
        setDistrictLoading(true);

        const result = await getDistricts();

        console.log("REAL AGRIWATCH DISTRICTS:", result);

        const realDistricts = result.districts || [];

        setDistricts(realDistricts);

        // Prefer Jacobabad for initial testing.
        // Otherwise use first district returned by backend.
        if (realDistricts.length > 0) {
          const jacobabad = realDistricts.find(
            (item) =>
              item.district?.toLowerCase() ===
              "jacobabad district"
          );

          setDistrict(
            jacobabad
              ? jacobabad.district
              : realDistricts[0].district
          );
        }
      } catch (error) {
        console.error("District loading error:", error);
      } finally {
        setDistrictLoading(false);
      }
    }

    loadDistricts();
  }, []);


  // ============================================================
  // RUN REAL ML PREDICTION
  // ============================================================

  useEffect(() => {
    if (!district) return;

    async function loadPrediction() {
      try {
        setMlLoading(true);
        setMlError(null);

        console.log("Predicting district:", district);

        const result = await predictDistrict(district);

        console.log(
          "REAL AGRIWATCH DISTRICT RESULT:",
          result
        );

        setMlResult(result);
      } catch (error) {
        console.error("AgriWatch ML error:", error);

        setMlError(
          error?.message || "Failed to load ML prediction."
        );

        setMlResult(null);
      } finally {
        setMlLoading(false);
      }
    }

    loadPrediction();
  }, [district]);


  // ============================================================
  // LOAD REAL DISTRICT HISTORY
  // ============================================================

  useEffect(() => {
    if (!district) return;

    async function loadHistory() {
      try {
        setHistoryLoading(true);
        setHistoryError(null);

        console.log("Loading district history:", district);

        const result = await getDistrictHistory(district);

        console.log(
          "REAL AGRIWATCH DISTRICT HISTORY:",
          result
        );

        setDistrictHistory(result.history || []);
      } catch (error) {
        console.error(
          "District history loading error:",
          error
        );

        setHistoryError(
          error?.message ||
            "Failed to load district history."
        );

        setDistrictHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [district]);


  // ============================================================
  // SELECTED DISTRICT INFORMATION
  // ============================================================

  const selectedDistrictInfo = districts.find(
    (item) => item.district === district
  );

  const selectedProvince =
    mlResult?.province ||
    selectedDistrictInfo?.province ||
    "";


  // ============================================================
  // FORMAT REAL HISTORY FOR RECHARTS
  // ============================================================

  const historyChartData = districtHistory.map((item) => {
    const date = new Date(`${item.date}T00:00:00`);

    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),

      fullDate: item.date,

      risk: Number(
        item.drought_probability_percent ?? 0
      ),

      probability: Number(
        item.drought_probability ?? 0
      ),

      predictedDrought:
        item.predicted_drought ?? 0,

      predictionStatus:
        item.prediction_status || "Unknown",

      riskLevel:
        item.risk_level || "Unknown",
    };
  });


  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function formatNumber(value, decimals = 3) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "--";
    }

    return number.toFixed(decimals);
  }


  function getRiskTextClass(riskLevel) {
    const risk = String(riskLevel || "").toLowerCase();

    if (risk === "severe") {
      return "text-danger";
    }

    if (risk === "high") {
      return "text-danger";
    }

    if (risk === "moderate") {
      return "text-warning";
    }

    return "text-success";
  }


  // ============================================================
  // CUSTOM HISTORY TOOLTIP
  // ============================================================

  function HistoryTooltip({
    active,
    payload,
    label,
  }) {
    if (
      active &&
      payload &&
      payload.length > 0
    ) {
      const data = payload[0].payload;

      return (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #DCE1D3",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "12px",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <p
            style={{
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {label}
          </p>

          <p>
            Drought Risk:{" "}
            <strong>
              {data.risk.toFixed(2)}%
            </strong>
          </p>

          <p>
            Risk Level:{" "}
            <strong>
              {data.riskLevel}
            </strong>
          </p>

          <p>
            Status:{" "}
            <strong>
              {data.predictionStatus}
            </strong>
          </p>

          <p>
            Date:{" "}
            <strong>
              {data.fullDate}
            </strong>
          </p>
        </div>
      );
    }

    return null;
  }


  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <Topbar
        title={t("ptAdminPredictionsTitle")}
        subtitle={t("ptAdminPredictionsSub")}
      />

      <main
        className="p-4 sm:p-8 space-y-6 pdma-page"
        dir="ltr"
      >
        <PdmaPageHero
          title="District drought prediction"
          copy="Inspect the latest Random Forest output and historical environmental pattern for any monitored district before taking operational action."
          stats={[
            { label: "Selected district", value: district || "Loading" },
            { label: "Risk level", value: mlResult?.risk_level || "—" },
            { label: "Drought probability", value: mlResult?.drought_probability_percent != null ? `${Number(mlResult.drought_probability_percent).toFixed(1)}%` : "—" },
          ]}
        />

        {/* =====================================================
            DISTRICT SELECTOR
        ===================================================== */}

        <Card className="pdma-control-strip flex flex-wrap items-center gap-4">
          <label className="text-sm text-ink/50">
            District
          </label>

          <select
            value={district}
            onChange={(e) =>
              setDistrict(e.target.value)
            }
            disabled={districtLoading}
            className="
              border
              border-line
              rounded-lg
              px-3
              py-2
              text-sm
              bg-surface
              min-w-[280px]
            "
          >
            {districtLoading && (
              <option>
                Loading districts...
              </option>
            )}

            {!districtLoading &&
              districts.map((d) => (
                <option
                  key={`${d.province}-${d.district}`}
                  value={d.district}
                >
                  {d.district} — {d.province}
                </option>
              ))}
          </select>

          <span
            className="
              text-xs
              text-ink/40
              font-mono
            "
          >
            Random Forest · 22 environmental features
          </span>
        </Card>


        {/* =====================================================
            REAL HISTORICAL ML GRAPH
        ===================================================== */}

        <Card scan>
          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-2
              mb-4
            "
          >
            <div>
              <p
                className="
                  font-display
                  font-semibold
                "
              >
                {district || "Select District"}
                {selectedProvince
                  ? ` — ${selectedProvince}`
                  : ""}
                {" — "}
                Drought Risk History
              </p>

              <p className="text-xs text-ink/40 mt-1">
                Historical monthly Random Forest
                drought probabilities
              </p>
            </div>

            <span
              className="
                text-xs
                font-mono
                text-ink/40
              "
            >
              ML-powered · Real data
            </span>
          </div>


          {/* HISTORY LOADING */}

          {historyLoading && (
            <div
              className="
                h-[300px]
                flex
                items-center
                justify-center
                text-sm
                text-ink/40
              "
            >
              Loading drought history...
            </div>
          )}


          {/* HISTORY ERROR */}

          {!historyLoading &&
            historyError && (
              <div
                className="
                  h-[300px]
                  flex
                  items-center
                  justify-center
                  text-sm
                  text-danger
                "
              >
                Failed to load drought history:{" "}
                {historyError}
              </div>
            )}


          {/* HISTORY CHART */}

          {!historyLoading &&
            !historyError &&
            historyChartData.length > 0 && (
              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <LineChart
                  data={historyChartData}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#DCE1D3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    interval="preserveStartEnd"
                    tick={{
                      fontSize: 11,
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
                    content={<HistoryTooltip />}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="risk"
                    stroke="#C1442D"
                    strokeWidth={2.5}
                    name="Drought Risk %"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}


          {/* NO HISTORY */}

          {!historyLoading &&
            !historyError &&
            historyChartData.length === 0 && (
              <div
                className="
                  h-[300px]
                  flex
                  items-center
                  justify-center
                  text-sm
                  text-ink/40
                "
              >
                No historical drought data
                available for this district.
              </div>
            )}
        </Card>


        {/* =====================================================
            REAL ML RESULT CARDS
        ===================================================== */}

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          "
        >

          {/* CURRENT RISK SCORE */}

          <Card>
            <p
              className="
                text-xs
                uppercase
                text-ink/40
                font-medium
                mb-1
              "
            >
              Current Risk Score
            </p>

            <p
              className={`
                font-display
                text-3xl
                font-semibold
                ${
                  mlResult
                    ? getRiskTextClass(
                        mlResult.risk_level
                      )
                    : "text-ink/40"
                }
              `}
            >
              {mlLoading
                ? "..."
                : mlError
                ? "Error"
                : mlResult
                ? `${formatNumber(
                    mlResult.drought_probability_percent,
                    2
                  )}%`
                : "--"}
            </p>

            <p
              className="
                text-xs
                text-ink/40
                mt-1
              "
            >
              {mlLoading
                ? "Running Random Forest..."
                : mlResult
                ? `${mlResult.risk_level} · ${mlResult.prediction_status}`
                : "Waiting for ML prediction"}
            </p>

            {mlResult?.district && (
              <p className="text-xs text-ink/40 mt-2">
                {mlResult.district}
                {mlResult.province
                  ? ` · ${mlResult.province}`
                  : ""}
              </p>
            )}
          </Card>


          {/* ENVIRONMENTAL DATA */}

          <Card>
            <p
              className="
                text-xs
                uppercase
                text-ink/40
                font-medium
                mb-1
              "
            >
              Environmental Data
            </p>

            {mlLoading ? (
              <p className="text-sm text-ink/40 mt-2">
                Loading environmental data...
              </p>
            ) : mlResult?.environmental_data ? (
              <ul
                className="
                  text-sm
                  text-ink/70
                  mt-2
                  space-y-1
                "
              >
                <li>
                  Rainfall:{" "}
                  <strong>
                    {formatNumber(
                      mlResult.environmental_data
                        .rainfall_mm,
                      3
                    )}
                  </strong>{" "}
                  mm
                </li>

                <li>
                  Soil Moisture:{" "}
                  <strong>
                    {formatNumber(
                      mlResult.environmental_data
                        .soil_moisture,
                      4
                    )}
                  </strong>
                </li>

                <li>
                  NDVI:{" "}
                  <strong>
                    {formatNumber(
                      mlResult.environmental_data
                        .ndvi,
                      4
                    )}
                  </strong>
                </li>

                <li>
                  Temperature:{" "}
                  <strong>
                    {formatNumber(
                      mlResult.environmental_data
                        .temperature_c,
                      2
                    )}
                  </strong>{" "}
                  °C
                </li>

                <li>
                  Evaporation:{" "}
                  <strong>
                    {formatNumber(
                      mlResult.environmental_data
                        .evaporation_mm,
                      3
                    )}
                  </strong>{" "}
                  mm
                </li>
              </ul>
            ) : (
              <p className="text-sm text-ink/40 mt-2">
                No environmental data available.
              </p>
            )}
          </Card>


          {/* WARNING STATUS */}

          <Card>
            <p
              className="
                text-xs
                uppercase
                text-ink/40
                font-medium
                mb-1
              "
            >
              Warning Status
            </p>

            <p
              className={`
                text-sm
                font-medium
                mt-2
                ${
                  mlResult
                    ? getRiskTextClass(
                        mlResult.risk_level
                      )
                    : "text-ink/70"
                }
              `}
            >
              {mlLoading
                ? "Running ML model..."
                : mlResult?.prediction_status ||
                  "Waiting for prediction"}
            </p>

            {mlResult && (
              <>
                <p
                  className="
                    text-xs
                    text-ink/40
                    mt-2
                  "
                >
                  Risk level:{" "}
                  <strong>
                    {mlResult.risk_level}
                  </strong>
                </p>

                <p
                  className="
                    text-xs
                    text-ink/40
                    mt-1
                  "
                >
                  Latest environmental data:{" "}
                  <strong>
                    {mlResult.data_date || "--"}
                  </strong>
                </p>

                <p
                  className="
                    text-xs
                    text-ink/40
                    mt-1
                  "
                >
                  Model prediction:{" "}
                  <strong>
                    {mlResult.predicted_drought === 1
                      ? "Drought"
                      : "No Drought"}
                  </strong>
                </p>
              </>
            )}
          </Card>
        </div>


        {/* =====================================================
            ML API ERROR
        ===================================================== */}

        {mlError && (
          <Card>
            <p className="text-danger text-sm">
              ML API Error: {mlError}
            </p>
          </Card>
        )}


        {/* =====================================================
            DATA SOURCE INFORMATION
        ===================================================== */}

        {mlResult && (
          <div
            className="
              text-xs
              text-ink/40
              font-mono
              px-1
            "
          >
            Live AgriWatch ML API · Random Forest ·
            Selected district: {mlResult.district}
            {mlResult.province
              ? ` · ${mlResult.province}`
              : ""}
          </div>
        )}

      </main>
    </>
  );
}