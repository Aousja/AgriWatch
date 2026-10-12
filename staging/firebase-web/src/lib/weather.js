// AgriWatch live 7-day weather for irrigation planning.
// Open-Meteo is free and requires no API key.

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_DAYS = 7;

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "et0_fao_evapotranspiration",
].join(",");

export function describeWeatherCode(code) {
  if (code === 0) return { label: "Clear sky", icon: "sun" };
  if (code <= 2) return { label: "Partly cloudy", icon: "cloud-sun" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "cloud-fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "cloud-drizzle" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "cloud-rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "cloud-snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "cloud-rain" };
  if (code >= 95) return { label: "Thunderstorm", icon: "cloud-lightning" };
  return { label: "—", icon: "cloud" };
}

export async function fetchDistrictWeather(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    throw new Error("Valid district latitude/longitude is required");
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: DAILY_VARS,
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);

  const json = await res.json();
  const d = json.daily;
  if (!d?.time?.length) throw new Error("Weather service returned no forecast");

  return d.time.map((date, i) => ({
    date,
    weekday: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
    }),
    weatherCode: d.weather_code?.[i] ?? 0,
    tempMax: round1(d.temperature_2m_max?.[i]),
    tempMin: round1(d.temperature_2m_min?.[i]),
    rainfallMm: round1(d.precipitation_sum?.[i] ?? 0),
    et0Mm: round1(d.et0_fao_evapotranspiration?.[i] ?? 0),
  }));
}

function round1(n) {
  return typeof n === "number" ? Math.round(n * 10) / 10 : n;
}
