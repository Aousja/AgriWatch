import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar";
import PdmaPageHero from "../components/PdmaPageHero";
import Card, { SeverityBadge } from "../components/Card";
import { getDistrictComparison } from "../services/droughtService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ArrowLeftRight } from "lucide-react";

export default function DistrictCompare() {
  const [districts, setDistricts] = useState([]);

  const [districtA, setDistrictA] = useState("");
  const [districtB, setDistrictB] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD REAL ML COMPARISON DATA
  // ============================================================

  useEffect(() => {
    async function loadComparisonData() {
      try {
        setLoading(true);
        setError("");

        const data = await getDistrictComparison();

        console.log(
          "COMPARE PAGE REAL ML DATA:",
          data
        );

        if (
          !data.success ||
          !Array.isArray(data.districts)
        ) {
          throw new Error(
            "Invalid comparison data received"
          );
        }

        setDistricts(data.districts);

        // Automatically select first two districts
        if (data.districts.length >= 2) {
          setDistrictA(
            data.districts[0].district
          );

          setDistrictB(
            data.districts[1].district
          );
        }
      } catch (err) {
        console.error(
          "Comparison page error:",
          err
        );

        setError(
          err.message ||
            "Unable to load district comparison."
        );
      } finally {
        setLoading(false);
      }
    }

    loadComparisonData();
  }, []);

  // ============================================================
  // FIND SELECTED DISTRICTS
  // ============================================================

  const a = useMemo(
    () =>
      districts.find(
        (district) =>
          district.district === districtA
      ),
    [districts, districtA]
  );

  const b = useMemo(
    () =>
      districts.find(
        (district) =>
          district.district === districtB
      ),
    [districts, districtB]
  );

  // ============================================================
  // SAFE ENVIRONMENTAL DATA
  // ============================================================

  const getEnvironmental = (district) => {
    return district?.environmental_data || {};
  };

  // ============================================================
  // COMPARISON TABLE ROWS
  // ============================================================

  const rows = [
    {
      label: "Drought Risk",
      render: (d) =>
        `${Number(
          d.drought_probability_percent ?? 0
        ).toFixed(2)}%`,
    },

    {
      label: "Severity",
      render: (d) => (
        <SeverityBadge
          level={d.risk_level || "Low"}
        />
      ),
    },

    {
      label: "Warning Status",
      render: (d) =>
        d.prediction_status || "Unknown",
    },

    {
      label: "Rainfall",
      render: (d) =>
        `${Number(
          getEnvironmental(d).rainfall_mm ?? 0
        ).toFixed(2)} mm`,
    },

    {
      label: "Soil Moisture",
      render: (d) =>
        Number(
          getEnvironmental(d).soil_moisture ?? 0
        ).toFixed(4),
    },

    {
      label: "NDVI",
      render: (d) =>
        Number(
          getEnvironmental(d).ndvi ?? 0
        ).toFixed(4),
    },

    {
      label: "Temperature",
      render: (d) =>
        `${Number(
          getEnvironmental(d).temperature_c ?? 0
        ).toFixed(2)} °C`,
    },

    {
      label: "Evaporation",
      render: (d) =>
        `${Number(
          getEnvironmental(d).evaporation_mm ?? 0
        ).toFixed(2)} mm`,
    },

    {
      label: "Province",
      render: (d) =>
        d.province || "Unknown",
    },

    {
      label: "Latest Data",
      render: (d) =>
        d.data_date || "N/A",
    },
  ];

  // ============================================================
  // BAR CHART DATA
  // ============================================================

  const chartData =
    a && b
      ? [
          {
            metric: "Drought Risk",
            [a.district]:
              Number(
                a.drought_probability_percent
              ) || 0,

            [b.district]:
              Number(
                b.drought_probability_percent
              ) || 0,
          },

          {
            metric: "NDVI",
            [a.district]:
              (Number(
                getEnvironmental(a).ndvi
              ) || 0) * 100,

            [b.district]:
              (Number(
                getEnvironmental(b).ndvi
              ) || 0) * 100,
          },

          {
            metric: "Soil Moisture",
            [a.district]:
              (Number(
                getEnvironmental(a)
                  .soil_moisture
              ) || 0) * 100,

            [b.district]:
              (Number(
                getEnvironmental(b)
                  .soil_moisture
              ) || 0) * 100,
          },
        ]
      : [];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <>
        <Topbar
          title="Compare Districts"
          subtitle="ML-powered district drought comparison"
        />

        <main className="p-4 sm:p-8 pdma-page">
          <Card>
            <p className="text-sm text-ink/60">
              Loading real AgriWatch ML data...
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <>
        <Topbar
          title="Compare Districts"
          subtitle="ML-powered district drought comparison"
        />

        <main className="p-4 sm:p-8 pdma-page">
          <Card>
            <p className="text-sm text-red-600">
              {error}
            </p>

            <p className="text-xs text-ink/50 mt-2">
              Make sure the FastAPI backend is
              running on port 8000.
            </p>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Compare Districts"
        subtitle="Side-by-side real Random Forest drought comparison"
      />

      <main
        className="p-4 sm:p-8 space-y-6 pdma-page"
        dir="ltr"
      >
        <PdmaPageHero
          eyebrow="PDMA district analysis"
          title="Compare drought conditions side by side"
          copy="Compare ML drought risk, vegetation, rainfall and soil moisture between two districts before prioritizing field response."
          stats={[
            { label: "District A", value: districtA || "Select" },
            { label: "District B", value: districtB || "Select" },
            { label: "Model", value: "Random Forest" },
          ]}
        />

        {/* =====================================================
            DISTRICT SELECTORS
        ===================================================== */}

        <Card className="pdma-control-strip flex items-center gap-3 flex-wrap">

          <select
            value={districtA}
            onChange={(e) =>
              setDistrictA(e.target.value)
            }
            className="form-select flex-1 min-w-[10rem]"
          >
            {districts.map((d) => (
              <option
                key={`a-${d.district}`}
                value={d.district}
              >
                {d.district} — {d.province}
              </option>
            ))}
          </select>

          <ArrowLeftRight
            size={16}
            className="text-ink/30 shrink-0"
          />

          <select
            value={districtB}
            onChange={(e) =>
              setDistrictB(e.target.value)
            }
            className="form-select flex-1 min-w-[10rem]"
          >
            {districts.map((d) => (
              <option
                key={`b-${d.district}`}
                value={d.district}
              >
                {d.district} — {d.province}
              </option>
            ))}
          </select>

        </Card>

        {a && b && (
          <>
            {/* =================================================
                COMPARISON TABLE
            ================================================= */}

            <Card className="overflow-x-auto pdma-data-card">

              <div className="mb-4">

                <p className="font-display font-semibold">
                  ML Drought Comparison
                </p>

                <p className="text-xs text-ink/40 mt-1">
                  Real Random Forest predictions using
                  environmental data
                </p>

              </div>

              <table className="w-full text-sm">

                <thead>
                  <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">

                    <th className="pb-3 font-medium w-1/3">
                      Metric
                    </th>

                    <th className="pb-3 font-medium">
                      {a.district}
                    </th>

                    <th className="pb-3 font-medium">
                      {b.district}
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {rows.map((row) => (

                    <tr
                      key={row.label}
                      className="border-b border-line last:border-0"
                    >

                      <td className="py-3 text-ink/50 font-medium">
                        {row.label}
                      </td>

                      <td className="py-3">
                        {row.render(a)}
                      </td>

                      <td className="py-3">
                        {row.render(b)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </Card>

            {/* =================================================
                ML RISK COMPARISON GRAPH
            ================================================= */}

            <Card className="pdma-data-card">

              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">

                <div>

                  <p className="font-display font-semibold">
                    Environmental & Risk Comparison
                  </p>

                  <p className="text-xs text-ink/40 mt-1">
                    ML drought risk and environmental
                    indicators
                  </p>

                </div>

                <span className="text-xs text-ink/40 font-mono">
                  ML-powered · Real data
                </span>

              </div>

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart data={chartData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#DCE1D3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="metric"
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
                    formatter={(value) => [
                      `${Number(value).toFixed(2)}%`,
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      border:
                        "1px solid #DCE1D3",
                      fontSize: 12,
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                    }}
                  />

                  <Bar
                    dataKey={a.district}
                    fill="#3F8C2C"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey={b.district}
                    fill="#D98A1F"
                    radius={[4, 4, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </Card>

            {/* =================================================
                QUICK RESULT
            ================================================= */}

            <Card>

              <p className="font-display font-semibold mb-3">
                Comparison Result
              </p>

              {Number(
                a.drought_probability
              ) >
              Number(
                b.drought_probability
              ) ? (

                <p className="text-sm text-ink/70">
                  <strong>
                    {a.district}
                  </strong>{" "}
                  currently has a higher predicted
                  drought risk at{" "}
                  <strong>
                    {Number(
                      a.drought_probability_percent
                    ).toFixed(2)}
                    %
                  </strong>{" "}
                  compared with{" "}
                  <strong>
                    {b.district}
                  </strong>{" "}
                  at{" "}
                  <strong>
                    {Number(
                      b.drought_probability_percent
                    ).toFixed(2)}
                    %
                  </strong>.
                </p>

              ) : Number(
                  b.drought_probability
                ) >
                Number(
                  a.drought_probability
                ) ? (

                <p className="text-sm text-ink/70">
                  <strong>
                    {b.district}
                  </strong>{" "}
                  currently has a higher predicted
                  drought risk at{" "}
                  <strong>
                    {Number(
                      b.drought_probability_percent
                    ).toFixed(2)}
                    %
                  </strong>{" "}
                  compared with{" "}
                  <strong>
                    {a.district}
                  </strong>{" "}
                  at{" "}
                  <strong>
                    {Number(
                      a.drought_probability_percent
                    ).toFixed(2)}
                    %
                  </strong>.
                </p>

              ) : (

                <p className="text-sm text-ink/70">
                  Both districts currently have the
                  same predicted drought probability.
                </p>

              )}

            </Card>
          </>
        )}

      </main>
    </>
  );
}