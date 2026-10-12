import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";

import Card, {
  SeverityBadge,
} from "../../components/Card";

import { getAlerts } from "../../services/droughtService";
import { useMyProfile } from "../../hooks/useMyProfile";

import {
  Bell,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Radio,
  Sparkles,
} from "lucide-react";


// ============================================================
// NORMALIZE DISTRICT NAME
// ============================================================

function normalizeDistrict(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+district$/i, "")
    .replace(/\s+/g, " ");
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


// ============================================================
// FARMER ALERTS
// ============================================================

export default function FarmerAlerts() {
  const { t } = useLanguage();

  // ----------------------------------------------------------
  // REAL LOGGED-IN FARMER
  // ----------------------------------------------------------

  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useMyProfile();


  // ----------------------------------------------------------
  // ALERT STATES
  // ----------------------------------------------------------

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsError, setAlertsError] = useState("");


  // ----------------------------------------------------------
  // FARMER DISTRICT
  // ----------------------------------------------------------

  const farmerDistrict =
    profile?.district?.trim() || "";


  // ----------------------------------------------------------
  // LOAD REAL ALERTS FROM FASTAPI
  // ----------------------------------------------------------

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (!farmerDistrict) {
      setAlerts([]);
      setLoadingAlerts(false);

      setAlertsError(
        "No district is assigned to your farmer profile."
      );

      return;
    }

    let cancelled = false;

    async function loadAlerts() {
      try {
        setLoadingAlerts(true);
        setAlertsError("");

        console.log(
          "LOADING FARMER ALERTS FOR:",
          farmerDistrict
        );

        const data = await getAlerts();

        console.log(
          "REAL FARMER ALERT DATA:",
          data
        );

        if (cancelled) return;


        // API may return:
        //
        // {
        //   success: true,
        //   count: 5,
        //   alerts: [...]
        // }
        //
        // OR directly [...]
        //
        // Support both.

        const allAlerts = Array.isArray(data)
          ? data
          : Array.isArray(data?.alerts)
          ? data.alerts
          : [];


        // ----------------------------------------------------
        // ONLY ALERTS FOR FARMER'S DISTRICT
        // ----------------------------------------------------

        const farmerDistrictNormalized =
          normalizeDistrict(farmerDistrict);

        const districtAlerts = allAlerts.filter(
          (alert) => {
            const alertDistrict =
              normalizeDistrict(alert?.district);

            return (
              alertDistrict === farmerDistrictNormalized
            );
          }
        );


        // ----------------------------------------------------
        // NEWEST FIRST
        // ----------------------------------------------------

        districtAlerts.sort((a, b) => {
          const dateA = new Date(
            a.created_at || a.date || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || b.date || 0
          ).getTime();

          return dateB - dateA;
        });


        setAlerts(districtAlerts);
      } catch (error) {
        console.error(
          "FARMER ALERT LOAD ERROR:",
          error
        );

        if (!cancelled) {
          setAlerts([]);

          setAlertsError(
            error?.message ||
              "Unable to load alerts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAlerts(false);
        }
      }
    }

    loadAlerts();

    return () => {
      cancelled = true;
    };
  }, [farmerDistrict, profileLoading]);


  // ----------------------------------------------------------
  // ALERT STATISTICS
  // ----------------------------------------------------------

  const statistics = useMemo(() => {
    let extreme = 0;
    let severe = 0;
    let moderate = 0;
    let normal = 0;

    alerts.forEach((alert) => {
      const severity = String(
        alert?.severity || ""
      ).toLowerCase();

      if (severity === "extreme") {
        extreme += 1;
      } else if (severity === "severe") {
        severe += 1;
      } else if (severity === "moderate") {
        moderate += 1;
      } else {
        normal += 1;
      }
    });

    return {
      total: alerts.length,
      extreme,
      severe,
      moderate,
      normal,
    };
  }, [alerts]);


  // ----------------------------------------------------------
  // MANUAL REFRESH
  // ----------------------------------------------------------

  async function handleRefresh() {
    if (!farmerDistrict) return;

    try {
      setLoadingAlerts(true);
      setAlertsError("");

      const data = await getAlerts();

      const allAlerts = Array.isArray(data)
        ? data
        : Array.isArray(data?.alerts)
        ? data.alerts
        : [];

      const targetDistrict =
        normalizeDistrict(farmerDistrict);

      const districtAlerts = allAlerts
        .filter(
          (alert) =>
            normalizeDistrict(alert?.district) ===
            targetDistrict
        )
        .sort((a, b) => {
          const dateA = new Date(
            a.created_at || a.date || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || b.date || 0
          ).getTime();

          return dateB - dateA;
        });

      setAlerts(districtAlerts);
    } catch (error) {
      console.error(error);

      setAlertsError(
        error?.message ||
          "Unable to refresh alerts."
      );
    } finally {
      setLoadingAlerts(false);
    }
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t("ptFarmerAlertsTitle")}
        subtitle={
          farmerDistrict
            ? `${t("ptFarmerAlertsSub")} — ${farmerDistrict}`
            : t("ptFarmerAlertsSub")
        }
      />

      <main
        className="farmer-page p-4 sm:p-8 space-y-6"
        dir="ltr"
      >

        {/* ================================================ */}
        {/* PROFILE ERROR */}
        {/* ================================================ */}

        {profileError && (
          <Card className="border-red-200 bg-red-50">
            <div className="flex gap-3 items-start">
              <AlertTriangle
                size={18}
                className="text-red-600 mt-0.5"
              />

              <div>
                <p className="font-medium text-sm text-red-700">
                  Farmer profile unavailable
                </p>

                <p className="text-xs text-red-600 mt-1">
                  {profileError?.message ||
                    "Unable to load your farmer profile."}
                </p>
              </div>
            </div>
          </Card>
        )}


        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> PDMA district alerts</span>
                <h2 className="farmer-hero-title">Official drought alerts for your area</h2>
                <p className="farmer-hero-copy">Stay aware of district warnings, severity changes and official action messages sent through AgriWatch.</p>
                <div className="farmer-hero-actions">
                  <span className="farmer-hero-button"><MapPin size={14} /> {farmerDistrict || "District not assigned"}</span>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loadingAlerts || profileLoading || !farmerDistrict}
                    className="farmer-hero-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={14} className={loadingAlerts ? "animate-spin" : ""} /> Refresh alerts
                  </button>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"><Bell size={22} /></div>
            </div>

            {!profileLoading && !loadingAlerts && !alertsError && (
              <div className="farmer-hero-stats">
                <div className="farmer-hero-stat"><span>Total alerts</span><strong>{statistics.total}</strong></div>
                <div className="farmer-hero-stat"><span>Severe + extreme</span><strong>{statistics.severe + statistics.extreme}</strong></div>
                <div className="farmer-hero-stat"><span>Monitoring</span><strong><Radio size={16} className="inline me-2" />Live</strong></div>
              </div>
            )}
          </div>
        </section>


        {/* ================================================ */}
        {/* SUMMARY */}
        {/* ================================================ */}

        {!profileLoading &&
          !loadingAlerts &&
          !alertsError && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <Card className="farmer-data-card">
                <p className="farmer-card-label">
                  Total Alerts
                </p>

                <p className="text-2xl font-display font-semibold mt-2">
                  {statistics.total}
                </p>
              </Card>


              <Card className="farmer-data-card">
                <p className="farmer-card-label">
                  Extreme
                </p>

                <p className="text-2xl font-display font-semibold mt-2 text-red-600">
                  {statistics.extreme}
                </p>
              </Card>


              <Card className="farmer-data-card">
                <p className="farmer-card-label">
                  Severe
                </p>

                <p className="text-2xl font-display font-semibold mt-2 text-orange-600">
                  {statistics.severe}
                </p>
              </Card>


              <Card className="farmer-data-card">
                <p className="farmer-card-label">
                  Moderate
                </p>

                <p className="text-2xl font-display font-semibold mt-2 text-yellow-600">
                  {statistics.moderate}
                </p>
              </Card>

            </div>
          )}


        {/* ================================================ */}
        {/* LOADING */}
        {/* ================================================ */}

        {(profileLoading || loadingAlerts) && (
          <div className="space-y-3">

            {[1, 2, 3].map((item) => (
              <Card key={item}>
                <div className="animate-pulse space-y-3">

                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-paper-dim rounded-full" />
                    <div className="h-4 w-24 bg-paper-dim rounded" />
                  </div>

                  <div className="h-4 w-36 bg-paper-dim rounded" />

                  <div className="h-4 w-3/4 bg-paper-dim rounded" />

                </div>
              </Card>
            ))}

          </div>
        )}


        {/* ================================================ */}
        {/* ERROR */}
        {/* ================================================ */}

        {!profileLoading &&
          !loadingAlerts &&
          alertsError && (
            <Card className="border-red-200 bg-red-50">

              <div className="flex gap-3 items-start">

                <AlertTriangle
                  size={18}
                  className="text-red-600 mt-0.5"
                />

                <div>
                  <p className="font-medium text-sm text-red-700">
                    Unable to load alerts
                  </p>

                  <p className="text-xs text-red-600 mt-1">
                    {alertsError}
                  </p>
                </div>

              </div>

            </Card>
          )}


        {/* ================================================ */}
        {/* NO ALERTS */}
        {/* ================================================ */}

        {!profileLoading &&
          !loadingAlerts &&
          !alertsError &&
          alerts.length === 0 && (
            <Card>

              <div className="py-10 text-center">

                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell
                    size={21}
                    className="text-primary"
                  />
                </div>

                <p className="font-display font-semibold mt-4">
                  No active alerts
                </p>

                <p className="text-sm text-ink/45 mt-1 max-w-md mx-auto">
                  There are currently no drought alerts
                  issued for{" "}
                  <span className="font-medium">
                    {farmerDistrict}
                  </span>
                  .
                </p>

              </div>

            </Card>
          )}


        {/* ================================================ */}
        {/* REAL ALERT LIST */}
        {/* ================================================ */}

        {!profileLoading &&
          !loadingAlerts &&
          !alertsError &&
          alerts.length > 0 && (
            <div className="space-y-3">

              {alerts.map((alert, index) => {

                const alertId =
                  alert.id ||
                  alert.alert_id ||
                  `alert-${index}`;

                const alertDate =
                  alert.created_at ||
                  alert.date;

                const audience =
                  alert.sentTo ||
                  alert.sent_to ||
                  alert.audience;

                return (
                  <Card
                    key={alertId}
                    className="farmer-list-row !p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0 flex-1">

                        {/* severity + date */}

                        <div className="flex items-center gap-2 mb-3 flex-wrap">

                          <SeverityBadge
                            level={
                              alert.severity ||
                              "Moderate"
                            }
                          />

                          <span className="text-xs text-ink/40 font-mono">
                            {formatDate(alertDate)}
                          </span>

                        </div>


                        {/* district */}

                        <p className="font-display font-semibold">
                          {alert.district ||
                            farmerDistrict}
                        </p>


                        {/* message */}

                        <p className="text-sm text-ink/60 mt-2 leading-relaxed">
                          {alert.message ||
                            "Drought advisory issued for your district."}
                        </p>


                        {/* extra info */}

                        <div className="flex gap-4 mt-4 flex-wrap">

                          {alertId && (
                            <span className="text-[11px] text-ink/35 font-mono">
                              ID: {alertId}
                            </span>
                          )}

                          {audience && (
                            <span className="text-[11px] text-ink/35">
                              Audience: {audience}
                            </span>
                          )}

                        </div>

                      </div>


                      <Bell
                        size={18}
                        className="text-primary shrink-0 mt-1"
                      />

                    </div>

                  </Card>
                );
              })}

            </div>
          )}

      </main>
    </>
  );
}