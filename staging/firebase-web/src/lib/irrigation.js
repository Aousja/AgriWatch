// AgriWatch explainable irrigation recommendation engine.
// Weather ET0 + FAO-style crop coefficient + current district soil moisture
// + AgriWatch ML drought probability are combined into a 7-day field plan.

export const CROP_COEFFICIENTS = {
  Wheat: { kcIni: 0.3, kcMid: 1.15, kcEnd: 0.4, tawMm: 100, depletionFraction: 0.55 },
  Rice: { kcIni: 1.05, kcMid: 1.2, kcEnd: 0.9, tawMm: 50, depletionFraction: 0.2 },
  Cotton: { kcIni: 0.35, kcMid: 1.18, kcEnd: 0.6, tawMm: 140, depletionFraction: 0.65 },
  Sugarcane: { kcIni: 0.4, kcMid: 1.25, kcEnd: 0.75, tawMm: 130, depletionFraction: 0.65 },
  Maize: { kcIni: 0.3, kcMid: 1.2, kcEnd: 0.35, tawMm: 110, depletionFraction: 0.55 },
  Other: { kcIni: 0.3, kcMid: 1.0, kcEnd: 0.5, tawMm: 100, depletionFraction: 0.5 },
};

export const CROP_OPTIONS = Object.keys(CROP_COEFFICIENTS);

export const GROWTH_STAGES = [
  { id: "initial", label: "Initial (0–3 weeks after sowing)" },
  { id: "development", label: "Development (3–6 weeks)" },
  { id: "mid", label: "Mid-season (6–12 weeks)" },
  { id: "late", label: "Late season (12+ weeks)" },
];

function kcForStage(c, stage) {
  if (stage === "initial") return c.kcIni;
  if (stage === "development") return (c.kcIni + c.kcMid) / 2;
  if (stage === "late") return c.kcEnd;
  return c.kcMid;
}

function acresToM2(acres) { return acres * 4046.86; }
function mmToLiters(mm, m2) { return mm * m2; }
function round1(n) { return Math.round(n * 10) / 10; }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

export function parseFarmSizeAcres(value) {
  const n = parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Soil moisture in the master dataset is treated as percentage-like data.
// We use it to estimate the starting root-zone deficit instead of the old
// hard-coded 60% demo assumption. Drought probability adds a small stress
// adjustment, making the schedule react to the trained Random Forest output.
function startingDeficit(rawMm, soilMoisture, droughtProbability) {
  const sm = Number(soilMoisture);
  const p = clamp(Number(droughtProbability) || 0, 0, 1);

  let fraction;
  if (!Number.isFinite(sm)) {
    fraction = 0.6;
  } else if (sm >= 35) {
    fraction = 0.25;
  } else if (sm >= 25) {
    fraction = 0.45;
  } else if (sm >= 15) {
    fraction = 0.7;
  } else {
    fraction = 0.9;
  }

  fraction = clamp(fraction + p * 0.15, 0.15, 1.0);
  return rawMm * fraction;
}

export function buildIrrigationPlan({
  weatherDays,
  crop = "Other",
  growthStage = "mid",
  farmSizeAcres = 1,
  currentSoilMoisture = null,
  droughtProbability = 0,
  district = "",
  dataDate = null,
}) {
  if (!Array.isArray(weatherDays) || weatherDays.length === 0) {
    throw new Error("Weather forecast is required to build irrigation plan");
  }

  const coeffs = CROP_COEFFICIENTS[crop] || CROP_COEFFICIENTS.Other;
  const kc = kcForStage(coeffs, growthStage);
  const taw = coeffs.tawMm;
  const raw = taw * coeffs.depletionFraction;
  const areaM2 = acresToM2(farmSizeAcres);

  let deficit = startingDeficit(raw, currentSoilMoisture, droughtProbability);
  let irrigationEvents = 0;
  let totalLiters = 0;
  let totalRainfallMm = 0;
  let totalEtcMm = 0;

  const days = weatherDays.map((w) => {
    const etcMm = round1((Number(w.et0Mm) || 0) * kc);
    const rain = Number(w.rainfallMm) || 0;
    const effectiveRainfallMm = round1(rain * 0.8);
    deficit = Math.max(0, deficit + etcMm - effectiveRainfallMm);

    totalRainfallMm += rain;
    totalEtcMm += etcMm;

    const deficitBeforeIrrigation = deficit;
    let action = "Hold";
    let irrigationDepthMm = 0;
    let note = `Estimated root-zone deficit is ${Math.round(deficit)}mm; irrigation trigger is ${Math.round(raw)}mm.`;

    if (deficit >= raw) {
      action = "Irrigate";
      irrigationDepthMm = Math.ceil(deficit);
      irrigationEvents += 1;
      totalLiters += mmToLiters(irrigationDepthMm, areaM2);
      note = `Water deficit reached the ${Math.round(raw)}mm trigger. Apply about ${irrigationDepthMm}mm.`;
      deficit = 0;
    } else if (rain >= etcMm && rain > 0) {
      note = `Forecast rainfall (${round1(rain)}mm) should cover today's estimated crop water use (${etcMm}mm).`;
    }

    return {
      ...w,
      etcMm,
      effectiveRainfallMm,
      deficitMm: Math.round(deficitBeforeIrrigation),
      action,
      irrigationDepthMm,
      irrigationLiters: Math.round(mmToLiters(irrigationDepthMm, areaM2)),
      note,
    };
  });

  const next = days.find((d) => d.action === "Irrigate");

  return {
    days,
    district,
    crop,
    growthStage,
    kc: round1(kc),
    tawMm: taw,
    rawMm: Math.round(raw),
    farmSizeAcres,
    currentSoilMoisture,
    droughtProbability,
    dataDate,
    summary: {
      irrigationEvents,
      totalLiters: Math.round(totalLiters),
      totalCubicMeters: round1(totalLiters / 1000),
      totalRainfallMm: round1(totalRainfallMm),
      totalEtcMm: round1(totalEtcMm),
      nextIrrigationDate: next?.date ?? null,
      nextIrrigationWeekday: next?.weekday ?? null,
    },
  };
}

export function buildGuidance(plan) {
  const tips = [];
  const { days, summary, crop, rawMm, currentSoilMoisture, droughtProbability } = plan;

  if (summary.irrigationEvents === 0) {
    tips.push({
      title: "No irrigation trigger in the next 7 days",
      detail: `Based on current district soil moisture and the weather forecast, ${crop.toLowerCase()} does not cross the ${rawMm}mm irrigation threshold this week.`,
    });
  } else {
    const first = days.find((d) => d.action === "Irrigate");
    tips.push({
      title: `Next irrigation: ${first.weekday}`,
      detail: `Apply about ${first.irrigationDepthMm}mm (${first.irrigationLiters.toLocaleString()} L for this field).`,
    });
  }

  if (Number.isFinite(Number(currentSoilMoisture))) {
    tips.push({
      title: "Current district soil moisture",
      detail: `${Number(currentSoilMoisture).toFixed(1)}% in the latest AgriWatch environmental record.`,
    });
  }

  if ((Number(droughtProbability) || 0) >= 0.5) {
    tips.push({
      title: "Elevated drought risk",
      detail: `The AgriWatch ML model currently estimates ${(Number(droughtProbability) * 100).toFixed(1)}% drought probability. Avoid unnecessary water losses and monitor the field closely.`,
    });
  }

  const hotDays = days.filter((d) => Number(d.tempMax) >= 40);
  if (hotDays.length) {
    tips.push({
      title: "Heat stress risk",
      detail: `${hotDays.length} forecast day${hotDays.length > 1 ? "s are" : " is"} at or above 40°C. Prefer early-morning or evening irrigation.`,
    });
  }

  if (summary.totalRainfallMm < 5) {
    tips.push({ title: "Dry week ahead", detail: `Only ${summary.totalRainfallMm}mm rainfall is forecast in the next 7 days.` });
  } else if (summary.totalRainfallMm >= 15) {
    tips.push({ title: "Useful rainfall expected", detail: `${summary.totalRainfallMm}mm rainfall is forecast. Reassess the field after rain before irrigating.` });
  }

  return tips;
}
