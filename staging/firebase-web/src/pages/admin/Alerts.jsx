import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";

import {
  useLanguage,
} from "../../i18n/LanguageContext";

import Card, {
  SeverityBadge,
} from "../../components/Card";

import { Send } from "lucide-react";

import {
  addRipple,
} from "../../utils/ripple";

import {
  useToast,
} from "../../components/ToastContext";

import {
  getMapData,
  getAlerts,
  createAlert,
} from "../../services/droughtService";


// ============================================================
// HELPERS
// ============================================================

function normalizeSeverity(
  level,
  probability = 0
) {
  const value = String(
    level || ""
  ).toLowerCase();

  const p = Number(
    probability || 0
  );

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


function safeNumber(
  value,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


// ============================================================
// ALERTS PAGE
// ============================================================

export default function Alerts() {

  const { t } = useLanguage();

  const { showToast } = useToast();

  const [searchParams] =
    useSearchParams();


  // ==========================================================
  // STATE
  // ==========================================================

  const [districts, setDistricts] =
    useState([]);

  const [alerts, setAlerts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    alertsLoading,
    setAlertsLoading,
  ] = useState(true);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const [
    form,
    setForm,
  ] = useState({

    district: "",

    severity: "Moderate",

    message: "",

    audience: "Farmers + Public",

  });


  // ==========================================================
  // LOAD 119 REAL ML DISTRICTS
  // ==========================================================

  useEffect(() => {

    let cancelled = false;


    async function loadDistricts() {

      try {

        setLoading(true);

        setError("");


        const result =
          await getMapData();


        console.log(
          "ALERT PAGE REAL MAP DATA:",
          result
        );


        const apiDistricts =
          Array.isArray(result)
            ? result
            : result?.districts || [];


        const cleaned =
          apiDistricts.map(
            (item, index) => {

              const probability =
                safeNumber(
                  item.drought_probability
                );


              const percent =
                safeNumber(
                  item.drought_probability_percent,
                  probability * 100
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

                severity:
                  normalizeSeverity(
                    item.risk_level,
                    probability
                  ),

                predictionStatus:
                  item.prediction_status ||
                  "Unknown",

              };

            }
          );


        // Alphabetical dropdown
        cleaned.sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );


        if (cancelled) {
          return;
        }


        setDistricts(cleaned);


        console.log(
          "ALERT DISTRICTS:",
          cleaned.length
        );


        // --------------------------------------------
        // CHECK QUERY PARAMETER
        // --------------------------------------------

        const prefillDistrict =
          searchParams.get(
            "district"
          );


        let selectedDistrict = null;


        if (prefillDistrict) {

          selectedDistrict =
            cleaned.find(
              (district) =>
                district.name ===
                prefillDistrict
            );

        }


        // If no URL district,
        // use first real district
        if (!selectedDistrict) {

          selectedDistrict =
            cleaned[0];

        }


        if (selectedDistrict) {

          setForm(
            (current) => ({

              ...current,

              district:
                selectedDistrict.name,

              severity:
                selectedDistrict.severity,

            })
          );

        }


      } catch (err) {

        console.error(
          "Alert district loading error:",
          err
        );


        if (!cancelled) {

          setError(
            err?.message ||
            "Failed to load districts."
          );

        }


      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }


    loadDistricts();


    return () => {

      cancelled = true;

    };

  }, [searchParams]);


  // ==========================================================
  // LOAD REAL ALERT HISTORY
  // ==========================================================

  useEffect(() => {

    let cancelled = false;


    async function loadAlertHistory() {

      try {

        setAlertsLoading(true);


        const result =
          await getAlerts();


        console.log(
          "REAL AGRIWATCH ALERTS:",
          result
        );


        const history =
          Array.isArray(result)
            ? result
            : result?.alerts || [];


        if (!cancelled) {

          setAlerts(history);

        }


      } catch (err) {

        console.error(
          "Alert history loading error:",
          err
        );


        if (!cancelled) {

          showToast(
            "Could not load alert history",
            "error"
          );

        }


      } finally {

        if (!cancelled) {

          setAlertsLoading(false);

        }

      }

    }


    loadAlertHistory();


    return () => {

      cancelled = true;

    };

  }, []);


  // ==========================================================
  // CURRENT SELECTED DISTRICT
  // ==========================================================

  const selectedDistrict =
    useMemo(() => {

      return districts.find(
        (district) =>
          district.name ===
          form.district
      );

    }, [
      districts,
      form.district,
    ]);


  // ==========================================================
  // DISTRICT CHANGE
  // ==========================================================

  function handleDistrictChange(e) {

    const districtName =
      e.target.value;


    const district =
      districts.find(
        (item) =>
          item.name ===
          districtName
      );


    setForm(
      (current) => ({

        ...current,

        district:
          districtName,

        // Automatically use
        // real ML severity
        severity:
          district?.severity ||
          current.severity,

      })
    );

  }


  // ==========================================================
  // GENERATE SUGGESTED MESSAGE
  // ==========================================================

  function generateSuggestedMessage() {

    if (!selectedDistrict) {
      return;
    }


    const district =
      selectedDistrict.name;


    const probability =
      selectedDistrict
        .droughtPercent
        .toFixed(1);


    let message = "";


    switch (
      selectedDistrict.severity
    ) {

      case "Extreme":

        message =
          `Extreme drought risk detected in ${district}. ` +
          `Current ML drought probability is ${probability}%. ` +
          `Immediate water conservation and drought response measures are advised.`;

        break;


      case "Severe":

        message =
          `Severe drought conditions are predicted in ${district}. ` +
          `Current ML drought probability is ${probability}%. ` +
          `Farmers are advised to conserve water and monitor crop stress closely.`;

        break;


      case "Moderate":

        message =
          `Moderate drought risk has been detected in ${district}. ` +
          `Current ML drought probability is ${probability}%. ` +
          `Please monitor water availability and crop conditions.`;

        break;


      default:

        message =
          `Current drought monitoring for ${district} shows low drought risk. ` +
          `ML drought probability is ${probability}%. ` +
          `Continue monitoring local environmental conditions.`;

        break;

    }


    setForm(
      (current) => ({

        ...current,

        message,

      })
    );

  }


  // ==========================================================
  // DISPATCH ALERT
  // ==========================================================

  async function handleSend(e) {

    e.preventDefault();


    if (!form.district) {

      showToast(
        "Please select a district",
        "error"
      );

      return;

    }


    if (!form.message.trim()) {

      showToast(
        "Please enter an alert message",
        "error"
      );

      return;

    }


    try {

      setSending(true);


      const payload = {

        district:
          form.district,

        severity:
          form.severity,

        message:
          form.message.trim(),

        audience:
          form.audience,

      };


      console.log(
        "DISPATCHING ALERT:",
        payload
      );


      const result =
        await createAlert(
          payload
        );


      const newAlert =
        result?.alert;


      if (newAlert) {

        setAlerts(
          (current) => [
            newAlert,
            ...current,
          ]
        );

      }


      setForm(
        (current) => ({

          ...current,

          message: "",

        })
      );


      showToast(
        `Alert dispatched to ${form.district}`,
        "success"
      );


    } catch (err) {

      console.error(
        "Dispatch error:",
        err
      );


      showToast(
        err?.message ||
        "Failed to dispatch alert",
        "error"
      );


    } finally {

      setSending(false);

    }

  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>

      <Topbar
        title={t(
          "ptAdminAlertsTitle"
        )}
        subtitle={t(
          "ptAdminAlertsSub"
        )}
      />


      <main
        className="p-4 sm:p-8 space-y-6 pdma-page"
        dir="ltr"
      >
        <PdmaPageHero
          title="Alert command center"
          copy="Create district-targeted drought alerts from the current ML severity and review the messages already dispatched to farmers and the public."
          stats={[
            { label: "Districts available", value: districts.length },
            { label: "Alerts recorded", value: alerts.length },
            { label: "Selected severity", value: form.severity },
          ]}
        />

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <Card>

            <p className="text-sm font-semibold text-red-600">
              Could not load ML district data.
            </p>

            <p className="text-xs text-ink/50 mt-1">
              {error}
            </p>

          </Card>

        )}


        {/* ==================================================
            CREATE ALERT
        ================================================== */}

        <Card className="pdma-form-card pdma-data-card">

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="font-display font-semibold">
                Create Alert
              </p>

              <p className="text-xs text-ink/40 mt-1">
                District severity is automatically selected from the current Random Forest prediction.
              </p>

            </div>

          </div>


          <form
            onSubmit={handleSend}
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >


            {/* DISTRICT */}

            <select
              value={
                form.district
              }
              onChange={
                handleDistrictChange
              }
              disabled={
                loading
              }
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface disabled:opacity-50"
            >

              {loading && (

                <option>
                  Loading districts...
                </option>

              )}


              {!loading &&
                districts.map(
                  (district) => (

                    <option
                      key={
                        district.id
                      }
                      value={
                        district.name
                      }
                    >

                      {district.name}
                      {" — "}
                      {district.province}

                    </option>

                  )
                )}

            </select>


            {/* SEVERITY */}

            <select
              value={
                form.severity
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  severity:
                    e.target.value,
                })
              }
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
            >

              {[
                "Normal",
                "Moderate",
                "Severe",
                "Extreme",
              ].map(
                (severity) => (

                  <option
                    key={
                      severity
                    }
                  >
                    {severity}
                  </option>

                )
              )}

            </select>


            {/* AUDIENCE */}

            <select
              value={
                form.audience
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  audience:
                    e.target.value,
                })
              }
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
            >

              <option>
                Farmers + Public
              </option>

              <option>
                Farmers
              </option>

              <option>
                General Public
              </option>

            </select>


            {/* DISPATCH */}

            <button
              type="submit"
              onMouseDown={
                addRipple
              }
              disabled={
                sending ||
                loading
              }
              className="btn-animated flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >

              <Send size={15} />

              {sending
                ? "Dispatching..."
                : "Dispatch"}

            </button>


            {/* CURRENT ML INFO */}

            {selectedDistrict && (

              <div className="md:col-span-4 flex flex-wrap items-center gap-3 text-xs">

                <span className="text-ink/50">
                  Current ML prediction:
                </span>

                <SeverityBadge
                  level={
                    selectedDistrict.severity
                  }
                />

                <span className="font-mono text-ink/60">
                  Risk{" "}
                  {selectedDistrict
                    .droughtPercent
                    .toFixed(2)}
                  %
                </span>


                <button
                  type="button"
                  onClick={
                    generateSuggestedMessage
                  }
                  className="text-primary font-medium hover:underline"
                >
                  Generate alert message
                </button>

              </div>

            )}


            {/* MESSAGE */}

            <textarea
              value={
                form.message
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  message:
                    e.target.value,
                })
              }
              placeholder="Alert message (will be sent in the recipient's chosen language — English or Urdu)"
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface md:col-span-4"
              rows={3}
            />

          </form>

        </Card>


        {/* ==================================================
            ALERT HISTORY
        ================================================== */}

        <Card>

          <div className="flex items-center justify-between mb-4">

            <div>

              <p className="font-display font-semibold">
                Alert History
              </p>

              <p className="text-xs text-ink/40 mt-1">
                Previously dispatched drought alerts
              </p>

            </div>


            {!alertsLoading && (

              <span className="text-xs text-ink/40">
                {alerts.length} alerts
              </span>

            )}

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">

                  <th className="pb-2 font-medium">
                    ID
                  </th>

                  <th className="pb-2 font-medium">
                    District
                  </th>

                  <th className="pb-2 font-medium">
                    Severity
                  </th>

                  <th className="pb-2 font-medium">
                    Message
                  </th>

                  <th className="pb-2 font-medium">
                    Audience
                  </th>

                  <th className="pb-2 font-medium">
                    Status
                  </th>

                  <th className="pb-2 font-medium">
                    Date
                  </th>

                </tr>

              </thead>


              <tbody>

                {alertsLoading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-ink/40"
                    >
                      Loading alert history...
                    </td>

                  </tr>

                ) : alerts.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="py-10 text-center"
                    >

                      <p className="text-sm font-medium">
                        No alerts dispatched yet
                      </p>

                      <p className="text-xs text-ink/40 mt-1">
                        New alerts will appear here after dispatch.
                      </p>

                    </td>

                  </tr>

                ) : (

                  alerts.map(
                    (alert) => (

                      <tr
                        key={
                          alert.id
                        }
                        className="border-b border-line last:border-0 hover:bg-paper-dim/60"
                      >

                        <td className="py-2.5 font-mono text-xs text-ink/50">
                          {alert.id}
                        </td>


                        <td className="py-2.5 font-medium">
                          {alert.district}
                        </td>


                        <td className="py-2.5">

                          <SeverityBadge
                            level={
                              alert.severity
                            }
                          />

                        </td>


                        <td
                          className="py-2.5 text-ink/60 max-w-xs truncate"
                          title={
                            alert.message
                          }
                        >
                          {alert.message}
                        </td>


                        <td className="py-2.5 text-ink/60">
                          {alert.sentTo ||
                            alert.audience}
                        </td>


                        <td className="py-2.5">

                          <span
                            className={
                              alert.status ===
                              "Delivered"
                                ? "text-green-700 text-xs font-medium"
                                : "text-ink/50 text-xs"
                            }
                          >

                            {alert.status ||
                              "Delivered"}

                          </span>

                        </td>


                        <td className="py-2.5 font-mono text-xs text-ink/50">
                          {alert.date}
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