import { useEffect, useMemo, useState, useCallback } from "react";

import Topbar from "../../components/Topbar";
import Card from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";
import { getMyFields } from "../../services/farmerFieldService";
import { useMyProfile } from "../../hooks/useMyProfile";

import {
  Droplets,
  CloudRain,
  Sprout,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// HELPERS
// ============================================================

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getSeverityFromPrediction(data) {
  if (!data) return "Normal";

  const raw =
    data.risk_level ||
    data.severity ||
    data.prediction_status ||
    data.status ||
    "";

  const value = String(raw).toLowerCase();

  if (
    value.includes("extreme") ||
    value === "severe"
  ) {
    return "Extreme";
  }

  if (value.includes("high")) {
    return "Severe";
  }

  if (value.includes("moderate")) {
    return "Moderate";
  }

  return "Normal";
}

function severityClasses(severity) {
  switch (severity) {
    case "Extreme":
      return "bg-red-100 text-red-700";

    case "Severe":
      return "bg-orange-100 text-orange-700";

    case "Moderate":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-green-100 text-green-700";
  }
}

function getIrrigationStatus(schedule) {
  const status = String(
    schedule?.status ||
      schedule?.recommendation_status ||
      schedule?.irrigation_status ||
      ""
  ).toLowerCase();

  if (
    status.includes("urgent") ||
    status.includes("immediate") ||
    status.includes("required")
  ) {
    return {
      label: "Irrigation Required",
      tone: "danger",
    };
  }

  if (status.includes("monitor")) {
    return {
      label: "Monitor Field",
      tone: "warn",
    };
  }

  if (
    status.includes("not required") ||
    status.includes("no irrigation") ||
    status.includes("sufficient")
  ) {
    return {
      label: "No Irrigation Required",
      tone: "ok",
    };
  }

  return {
    label: "Irrigation Recommendation",
    tone: "normal",
  };
}

// ============================================================
// COMPONENT
// ============================================================

export default function IrrigationScheduler() {
  const { t } = useLanguage();

  // ============================================================
  // REAL LOGGED-IN FARMER PROFILE
  // Same source already working in FarmerHome.jsx
  // ============================================================

  const {
    user,
    profile,
    loading: profileLoading,
    error: profileError,
  } = useMyProfile();

  const district = profile?.district?.trim() || "";

  // ============================================================
  // FARMER FIELDS
  // ============================================================

  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");

  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState("");

  // ============================================================
  // ML DISTRICT PREDICTION
  // ============================================================

  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] =
    useState(false);

  const [predictionError, setPredictionError] =
    useState("");

  // ============================================================
  // IRRIGATION RESULT
  // ============================================================

  const [schedule, setSchedule] = useState(null);

  const [scheduleLoading, setScheduleLoading] =
    useState(false);

  const [scheduleError, setScheduleError] =
    useState("");

  // ============================================================
  // SELECTED FIELD
  // ============================================================

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;

    return (
      fields.find(
        (field) =>
          String(field.id) ===
          String(selectedFieldId)
      ) || null
    );
  }, [fields, selectedFieldId]);

  // ============================================================
  // LOAD FARMER'S REAL FIELDS
  // ============================================================

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (!user?.id) {
      setFields([]);
      setSelectedFieldId("");
      setFieldsLoading(false);

      setFieldsError(
        "No logged-in farmer was found."
      );

      return;
    }

    let cancelled = false;

    async function loadFields() {
      try {
        setFieldsLoading(true);
        setFieldsError("");

        console.log(
          "LOADING FIELDS FOR FARMER:",
          user.id
        );

        const data = await getMyFields(user.id);

        if (cancelled) return;

        const loadedFields = Array.isArray(data)
          ? data
          : [];

        console.log(
          "REAL FARMER FIELDS:",
          loadedFields
        );

        setFields(loadedFields);

        if (loadedFields.length > 0) {
          setSelectedFieldId((current) => {
            const stillExists =
              current &&
              loadedFields.some(
                (field) =>
                  String(field.id) ===
                  String(current)
              );

            if (stillExists) {
              return current;
            }

            return String(loadedFields[0].id);
          });
        } else {
          setSelectedFieldId("");
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "FARMER FIELD LOAD ERROR:",
          error
        );

        setFields([]);
        setSelectedFieldId("");

        setFieldsError(
          error?.message ||
            "Unable to load your farm fields."
        );
      } finally {
        if (!cancelled) {
          setFieldsLoading(false);
        }
      }
    }

    loadFields();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profileLoading]);

  // ============================================================
  // LOAD REAL ML DISTRICT PREDICTION
  // ============================================================

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (!district) {
      setPrediction(null);
      setPredictionLoading(false);

      setPredictionError(
        "No district is assigned to your farmer profile."
      );

      return;
    }

    let cancelled = false;

    async function loadPrediction() {
      try {
        setPredictionLoading(true);
        setPredictionError("");

        console.log(
          "LOADING IRRIGATION ML DATA FOR:",
          district
        );

        const response = await fetch(
          `${API_URL}/predict-district/${encodeURIComponent(
            district
          )}`
        );

        if (!response.ok) {
          let message = "";

          try {
            const errorData = await response.json();

            message =
              errorData?.detail ||
              errorData?.message ||
              "";
          } catch {
            // ignore JSON error
          }

          throw new Error(
            message ||
              `Prediction failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (cancelled) return;

        console.log(
          "IRRIGATION ML PREDICTION:",
          data
        );

        setPrediction(data);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "IRRIGATION ML ERROR:",
          error
        );

        setPrediction(null);

        setPredictionError(
          error?.message ||
            "Unable to load district ML data."
        );
      } finally {
        if (!cancelled) {
          setPredictionLoading(false);
        }
      }
    }

    loadPrediction();

    return () => {
      cancelled = true;
    };
  }, [district, profileLoading]);

  // ============================================================
  // GET IRRIGATION RECOMMENDATION
  // ============================================================

  const loadIrrigationRecommendation =
    useCallback(async () => {
      if (!selectedField) {
        return;
      }

      if (!district) {
        setScheduleError(
          "Farmer district is not available."
        );

        return;
      }

      try {
        setScheduleLoading(true);
        setScheduleError("");
        setSchedule(null);

        const payload = {
          district,

          field_id: selectedField.id,

          field_name:
            selectedField.field_name ||
            "Field",

          crop:
            selectedField.crop || "",

          area_acres: safeNumber(
            selectedField.area_acres
          ),
        };

        console.log(
          "IRRIGATION REQUEST:",
          payload
        );

        const response = await fetch(
          `${API_URL}/irrigation-recommendation`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          let errorMessage = "";

          try {
            const errorData =
              await response.json();

            errorMessage =
              errorData?.detail ||
              errorData?.message ||
              "";
          } catch {
            // ignore JSON parsing error
          }

          throw new Error(
            errorMessage ||
              `Irrigation request failed: ${response.status}`
          );
        }

        const data = await response.json();

        console.log(
          "REAL AGRIWATCH IRRIGATION RESULT:",
          data
        );

        setSchedule(data);
      } catch (error) {
        console.error(
          "IRRIGATION RECOMMENDATION ERROR:",
          error
        );

        setScheduleError(
          error?.message ||
            "Unable to calculate irrigation recommendation."
        );
      } finally {
        setScheduleLoading(false);
      }
    }, [district, selectedField]);

  // ============================================================
  // AUTO LOAD WHEN FIELD/DISTRICT CHANGES
  // ============================================================

  useEffect(() => {
    if (
      profileLoading ||
      predictionLoading ||
      !district ||
      !selectedField
    ) {
      return;
    }

    loadIrrigationRecommendation();
  }, [
    district,
    selectedField,
    profileLoading,
    predictionLoading,
    loadIrrigationRecommendation,
  ]);

  // ============================================================
  // ML VALUES
  // ============================================================

  const environmental =
    prediction?.environmental_data || {};

  const severity =
    getSeverityFromPrediction(prediction);

  const droughtProbability = safeNumber(
    prediction?.drought_probability_percent ??
      prediction?.drought_probability
  );

  const rawSoilMoisture = safeNumber(
    environmental.soil_moisture ??
      prediction?.soil_moisture
  );

  // API may return 0.274 or 27.4
  const soilMoisturePercent =
    rawSoilMoisture <= 1
      ? rawSoilMoisture * 100
      : rawSoilMoisture;

  const rainfall = safeNumber(
    environmental.rainfall_mm ??
      environmental.rainfall ??
      prediction?.rainfall_mm ??
      prediction?.rainfall
  );

  const ndvi = safeNumber(
    environmental.ndvi ??
      prediction?.ndvi
  );

  // ============================================================
  // IRRIGATION RESULT VALUES
  // ============================================================

  const irrigationAmount = safeNumber(
    schedule?.irrigation_mm ??
      schedule?.recommended_irrigation_mm ??
      schedule?.water_required_mm ??
      schedule?.water_mm
  );

  const waterLitres = safeNumber(
    schedule?.water_litres ??
      schedule?.water_liters ??
      schedule?.estimated_water_litres
  );

  const nextIrrigation =
    schedule?.next_irrigation ||
    schedule?.next_irrigation_date ||
    schedule?.recommended_date ||
    schedule?.schedule_date ||
    "—";

  const recommendation =
    schedule?.recommendation ||
    schedule?.message ||
    schedule?.advice ||
    schedule?.irrigation_advice ||
    "";

  const irrigationStatus =
    getIrrigationStatus(schedule);

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <Topbar
        title={
          t?.("ptFarmerIrrigationTitle") ||
          "Irrigation Scheduler"
        }
        subtitle={
          district
            ? `Smart irrigation guidance · ${district}`
            : "Smart irrigation guidance"
        }
      />

      <main
        className="farmer-page p-4 sm:p-8 space-y-6"
        dir="ltr"
      >
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> Smart irrigation assistant</span>
                <h2 className="farmer-hero-title">Water guidance for your registered fields</h2>
                <p className="farmer-hero-copy">AgriWatch combines field size, crop information and district environmental conditions to produce a practical irrigation recommendation.</p>
                <div className="farmer-hero-actions">
                  <span className="farmer-hero-button"><MapPin size={14} /> {district || "District not configured"}</span>
                  {selectedField && <span className="farmer-hero-button"><Sprout size={14} /> {selectedField.field_name}</span>}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"><Droplets size={23} /></div>
            </div>

            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Drought status</span><strong>{predictionLoading ? "Scanning…" : severity}</strong></div>
              <div className="farmer-hero-stat"><span>Soil moisture</span><strong>{predictionLoading ? "—" : `${soilMoisturePercent.toFixed(1)}%`}</strong></div>
              <div className="farmer-hero-stat"><span>Recommendation</span><strong>{scheduleLoading ? "Calculating…" : irrigationStatus.label}</strong></div>
            </div>
          </div>
        </section>

        {/* PROFILE ERROR */}

        {profileError && (
          <Card>
            <div className="flex items-start gap-3 text-red-600">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-medium text-sm">
                  Unable to load farmer profile
                </p>

                <p className="text-xs mt-1">
                  {profileError?.message ||
                    "Please refresh the page or sign in again."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* NO DISTRICT */}

        {!profileLoading &&
          !profileError &&
          !district && (
            <Card>
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="text-orange-500 mt-0.5"
                />

                <div>
                  <p className="font-medium">
                    District not configured
                  </p>

                  <p className="text-sm text-ink/50 mt-1">
                    Add your district to your
                    farmer profile before using
                    irrigation recommendations.
                  </p>
                </div>
              </div>
            </Card>
          )}

        {/* FIELD SELECTOR */}

        <Card className="farmer-form-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="font-display font-semibold text-lg">
                Select Your Field
              </p>

              <p className="text-sm text-ink/45 mt-1">
                Irrigation guidance is
                calculated separately for each
                registered field.
              </p>
            </div>

            {!fieldsLoading &&
              fields.length > 0 && (
                <select
                  value={selectedFieldId}
                  onChange={(e) =>
                    setSelectedFieldId(
                      e.target.value
                    )
                  }
                  className="border border-line rounded-lg px-4 py-2.5 text-sm bg-surface min-w-[250px]"
                >
                  {fields.map((field) => (
                    <option
                      key={field.id}
                      value={String(field.id)}
                    >
                      {field.field_name} —{" "}
                      {field.crop}
                    </option>
                  ))}
                </select>
              )}
          </div>

          {(profileLoading ||
            fieldsLoading) && (
            <p className="text-sm text-ink/45 mt-5">
              Loading your farm fields...
            </p>
          )}

          {fieldsError && (
            <div className="flex items-start gap-2 mt-5 text-red-600">
              <AlertTriangle
                size={17}
                className="mt-0.5"
              />

              <p className="text-sm">
                {fieldsError}
              </p>
            </div>
          )}

          {!profileLoading &&
            !fieldsLoading &&
            !fieldsError &&
            fields.length === 0 && (
              <div className="flex items-start gap-2 mt-5">
                <AlertTriangle
                  size={17}
                  className="text-orange-500 mt-0.5"
                />

                <p className="text-sm text-ink/55">
                  You do not have any registered
                  fields. Add a farm field first
                  to generate irrigation
                  recommendations.
                </p>
              </div>
            )}
        </Card>

        {/* FIELD DETAILS */}

        {selectedField && (
          <Card className="farmer-form-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <p className="farmer-card-label">
                  Field
                </p>

                <p className="font-semibold mt-1">
                  {selectedField.field_name}
                </p>
              </div>

              <div>
                <p className="farmer-card-label">
                  Crop
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <Sprout
                    size={16}
                    className="text-primary"
                  />

                  <p className="font-semibold capitalize">
                    {selectedField.crop}
                  </p>
                </div>
              </div>

              <div>
                <p className="farmer-card-label">
                  Area
                </p>

                <p className="font-semibold mt-1">
                  {safeNumber(
                    selectedField.area_acres
                  )}{" "}
                  acres
                </p>
              </div>

              <div>
                <p className="farmer-card-label">
                  District
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <MapPin
                    size={16}
                    className="text-primary"
                  />

                  <p className="font-semibold">
                    {district ||
                      "Not available"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ML ERROR */}

        {selectedField &&
          predictionError && (
            <Card>
              <div className="flex items-start gap-3 text-red-600">
                <AlertTriangle
                  size={18}
                  className="mt-0.5"
                />

                <div>
                  <p className="font-medium text-sm">
                    District ML data could not
                    be loaded
                  </p>

                  <p className="text-xs mt-1">
                    {predictionError}
                  </p>
                </div>
              </div>
            </Card>
          )}

        {/* ML CONDITIONS */}

        {selectedField &&
          !predictionError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* DROUGHT */}

              <Card className="farmer-data-card">
                <p className="farmer-card-label">
                  Drought Status
                </p>

                {predictionLoading ||
                profileLoading ? (
                  <p className="text-sm text-ink/40 mt-4">
                    Loading...
                  </p>
                ) : (
                  <>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mt-3 ${severityClasses(
                        severity
                      )}`}
                    >
                      {severity}
                    </span>

                    <p className="text-xs text-ink/45 mt-3">
                      ML probability:{" "}
                      {droughtProbability.toFixed(
                        1
                      )}
                      %
                    </p>
                  </>
                )}
              </Card>

              {/* SOIL */}

              <Card className="farmer-data-card">
                <div className="flex justify-between">
                  <p className="farmer-card-label">
                    Soil Moisture
                  </p>

                  <Droplets
                    size={18}
                    className="text-primary"
                  />
                </div>

                {predictionLoading ? (
                  <p className="text-sm text-ink/40 mt-4">
                    Loading...
                  </p>
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold mt-3">
                      {soilMoisturePercent.toFixed(
                        1
                      )}

                      <span className="text-sm ml-1 text-ink/45">
                        %
                      </span>
                    </p>

                    <p className="text-xs text-ink/40 mt-2">
                      Current soil moisture
                    </p>
                  </>
                )}
              </Card>

              {/* RAINFALL */}

              <Card className="farmer-data-card">
                <div className="flex justify-between">
                  <p className="farmer-card-label">
                    Rainfall
                  </p>

                  <CloudRain
                    size={18}
                    className="text-primary"
                  />
                </div>

                {predictionLoading ? (
                  <p className="text-sm text-ink/40 mt-4">
                    Loading...
                  </p>
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold mt-3">
                      {rainfall.toFixed(1)}

                      <span className="text-sm ml-1 text-ink/45">
                        mm
                      </span>
                    </p>

                    <p className="text-xs text-ink/40 mt-2">
                      Current monthly rainfall
                    </p>
                  </>
                )}
              </Card>

              {/* NDVI */}

              <Card className="farmer-data-card">
                <div className="flex justify-between">
                  <p className="farmer-card-label">
                    NDVI
                  </p>

                  <Sprout
                    size={18}
                    className="text-primary"
                  />
                </div>

                {predictionLoading ? (
                  <p className="text-sm text-ink/40 mt-4">
                    Loading...
                  </p>
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold mt-3">
                      {ndvi.toFixed(3)}
                    </p>

                    <p className="text-xs text-ink/40 mt-2">
                      Current vegetation index
                    </p>
                  </>
                )}
              </Card>
            </div>
          )}

        {/* IRRIGATION RECOMMENDATION */}

        {selectedField && district && (
          <Card className="farmer-form-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-display font-semibold text-lg">
                  Irrigation Recommendation
                </p>

                <p className="text-sm text-ink/45 mt-1">
                  {selectedField.field_name} ·{" "}
                  {selectedField.crop} ·{" "}
                  {selectedField.area_acres} acres
                </p>
              </div>

              <button
                type="button"
                onClick={
                  loadIrrigationRecommendation
                }
                disabled={
                  scheduleLoading ||
                  predictionLoading
                }
                className="btn-animated flex items-center gap-2 border border-line rounded-xl px-4 py-2.5 text-sm font-medium bg-surface hover:bg-paper-dim disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={
                    scheduleLoading
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>
            </div>

            {scheduleLoading && (
              <div className="py-12 text-center text-sm text-ink/45">
                Calculating irrigation
                requirement...
              </div>
            )}

            {!scheduleLoading &&
              scheduleError && (
                <div className="mt-6 bg-danger/5 border border-danger/20 rounded-xl p-4">
                  <div className="flex gap-2">
                    <AlertTriangle
                      size={18}
                      className="text-danger shrink-0"
                    />

                    <div>
                      <p className="font-medium text-sm text-danger">
                        Irrigation calculation
                        failed
                      </p>

                      <p className="text-xs text-danger mt-1">
                        {scheduleError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {!scheduleLoading &&
              !scheduleError &&
              schedule && (
                <div className="mt-6 space-y-5">
                  {/* RESULT */}

                  <div
                    className={`rounded-xl p-4 ${
                      irrigationStatus.tone ===
                      "danger"
                        ? "bg-danger/5 border border-danger/15"
                        : irrigationStatus.tone ===
                          "warn"
                        ? "bg-warn/5 border border-warn/15"
                        : irrigationStatus.tone ===
                          "ok"
                        ? "bg-primary/5 border border-primary/15"
                        : "bg-paper-dim border border-line"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={18}
                        className="text-primary"
                      />

                      <p className="font-semibold">
                        {
                          irrigationStatus.label
                        }
                      </p>
                    </div>

                    {recommendation && (
                      <p className="text-sm text-ink/60 mt-2">
                        {recommendation}
                      </p>
                    )}
                  </div>

                  {/* VALUES */}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="farmer-field-panel">
                      <p className="farmer-card-label">
                        Recommended Water
                      </p>

                      <p className="text-xl font-semibold mt-2">
                        {irrigationAmount > 0
                          ? `${irrigationAmount.toFixed(
                              1
                            )} mm`
                          : "—"}
                      </p>
                    </div>

                    <div className="farmer-field-panel">
                      <p className="farmer-card-label">
                        Estimated Water
                      </p>

                      <p className="text-xl font-semibold mt-2">
                        {waterLitres > 0
                          ? `${Math.round(
                              waterLitres
                            ).toLocaleString()} L`
                          : "—"}
                      </p>
                    </div>

                    <div className="farmer-field-panel">
                      <p className="farmer-card-label">
                        Next Irrigation
                      </p>

                      <p className="text-xl font-semibold mt-2">
                        {nextIrrigation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {!scheduleLoading &&
              !scheduleError &&
              !schedule &&
              !predictionLoading && (
                <div className="py-8 text-center text-sm text-ink/40">
                  Waiting for irrigation
                  recommendation...
                </div>
              )}
          </Card>
        )}
      </main>
    </>
  );
}