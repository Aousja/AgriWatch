import { useCallback, useEffect, useState } from "react";
import { fetchDistrictWeather } from "./weather";
import {
  buildGuidance,
  buildIrrigationPlan,
  parseFarmSizeAcres,
} from "./irrigation";

const API_URL = "http://127.0.0.1:8000";

async function fetchIrrigationContext(districtName) {
  const response = await fetch(
    `${API_URL}/irrigation-context/${encodeURIComponent(districtName)}`
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Irrigation context failed: ${response.status}`);
  }

  return response.json();
}

export function useIrrigationForecast({
  districtName,
  crop,
  growthStage,
  farmSize,
}) {
  const [plan, setPlan] = useState(null);
  const [guidance, setGuidance] = useState([]);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!districtName) {
      setPlan(null);
      setGuidance([]);
      setContext(null);
      setError(new Error("Farmer district is missing"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1) Real AgriWatch Random Forest + current environmental data +
      //    official district coordinates from the backend.
      const ctx = await fetchIrrigationContext(districtName);
      setContext(ctx);

      // 2) Live 7-day weather for that real district coordinate.
      const weatherDays = await fetchDistrictWeather(ctx.latitude, ctx.longitude);

      // 3) Explainable field-specific irrigation plan.
      const builtPlan = buildIrrigationPlan({
        weatherDays,
        crop: crop || "Other",
        growthStage: growthStage || "mid",
        farmSizeAcres: parseFarmSizeAcres(farmSize),
        currentSoilMoisture: ctx.environmental_data?.soil_moisture ?? null,
        droughtProbability: ctx.drought_probability ?? 0,
        district: ctx.district,
        dataDate: ctx.data_date,
      });

      setPlan(builtPlan);
      setGuidance(buildGuidance(builtPlan));
      setOffline(false);
    } catch (err) {
      console.error("IRRIGATION FORECAST ERROR:", err);
      setPlan(null);
      setGuidance([]);
      setContext(null);
      setOffline(true);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [districtName, crop, growthStage, farmSize]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    plan,
    guidance,
    context,
    loading,
    offline,
    error,
    reload: load,
  };
}
