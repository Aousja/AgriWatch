import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useState } from "react";

import Topbar from "../../components/Topbar";
import Card, { SeverityBadge } from "../../components/Card";
import { useLanguage } from "../../i18n/LanguageContext";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "https://agri-watch-backend.vercel.app")
).replace(/\/$/, "");

// ============================================================
// PUBLIC USER DISTRICT
// Later we will get this from logged-in user's profile.
// ============================================================

const USER_DISTRICT = "Peshawar District";

// User district + 7 nearest districts
const NEARBY_COUNT = 7;

// ============================================================
// ML RISK COLORS
// ============================================================

const riskColor = {
  Low: "#2f8f2f",
  Moderate: "#d9a300",
  High: "#e67e22",
  Severe: "#c73b22",
};

// ============================================================
// PROVINCE NAME NORMALIZATION
// ============================================================

function normalizeProvince(province) {
  const value = String(province || "").trim();

  const mapping = {
    "North-West Frontier": "Khyber Pakhtunkhwa",
    NWFP: "Khyber Pakhtunkhwa",
    KPK: "Khyber Pakhtunkhwa",
    KP: "Khyber Pakhtunkhwa",
  };

  return mapping[value] || value;
}

// ============================================================
// HAVERSINE DISTANCE
// ============================================================

function distanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}

// ============================================================
// MAP CONTROLLER
// Centers map when district becomes available.
// ============================================================

function MapController({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;

    map.setView(center, 8);
  }, [center, map]);

  return null;
}

// ============================================================
// SAFE PROBABILITY
// ============================================================

function getProbability(district) {
  if (
    district?.drought_probability_percent !==
      undefined &&
    district?.drought_probability_percent !== null
  ) {
    return Number(
      district.drought_probability_percent
    );
  }

  if (
    district?.drought_probability !==
      undefined &&
    district?.drought_probability !== null
  ) {
    return (
      Number(district.drought_probability) * 100
    );
  }

  return 0;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function RegionalMap() {
  const { t } = useLanguage();

  const [allDistricts, setAllDistricts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // LOAD REAL BACKEND ML MAP DATA
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE}/map-data`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({}));

          throw new Error(
            errorData.detail ||
              errorData.error ||
              `Map request failed (${response.status})`
          );
        }

        const data = await response.json();

        console.log(
          "PUBLIC REGIONAL MAP REAL DATA:",
          data
        );

        if (!data.success) {
          throw new Error(
            data.error ||
              "Backend map request failed."
          );
        }

        const districts =
          Array.isArray(data.districts)
            ? data.districts
            : [];

        if (!districts.length) {
          throw new Error(
            "No district map data was returned."
          );
        }

        if (!cancelled) {
          setAllDistricts(districts);
        }
      } catch (err) {
        console.error(
          "PUBLIC REGIONAL MAP ERROR:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load regional map."
          );
        }
      } finally {
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
  // FIND PUBLIC USER DISTRICT
  // ==========================================================

  const userDistrict = useMemo(() => {
    if (!allDistricts.length) {
      return null;
    }

    const requested =
      USER_DISTRICT.trim().toLowerCase();

    // Exact match
    let match = allDistricts.find(
      (district) =>
        String(district.district || "")
          .trim()
          .toLowerCase() === requested
    );

    // Fallback:
    // "Peshawar District" = "Peshawar"
    if (!match) {
      const simplifiedRequested =
        requested.replace(
          /\s+district$/,
          ""
        );

      match = allDistricts.find(
        (district) => {
          const simplifiedDistrict =
            String(
              district.district || ""
            )
              .trim()
              .toLowerCase()
              .replace(
                /\s+district$/,
                ""
              );

          return (
            simplifiedDistrict ===
            simplifiedRequested
          );
        }
      );
    }

    return match || null;
  }, [allDistricts]);

  // ==========================================================
  // FIND NEAREST DISTRICTS
  // ==========================================================

  const regionalDistricts =
    useMemo(() => {
      if (
        !userDistrict ||
        !allDistricts.length
      ) {
        return [];
      }

      const userLat =
        Number(userDistrict.latitude);

      const userLng =
        Number(userDistrict.longitude);

      if (
        !Number.isFinite(userLat) ||
        !Number.isFinite(userLng)
      ) {
        return [];
      }

      return allDistricts
        .map((district) => {
          const lat =
            Number(district.latitude);

          const lng =
            Number(district.longitude);

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            return null;
          }

          return {
            ...district,

            distance_km: distanceKm(
              userLat,
              userLng,
              lat,
              lng
            ),
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.distance_km -
            b.distance_km
        )
        .slice(
          0,
          NEARBY_COUNT + 1
        );
    }, [
      allDistricts,
      userDistrict,
    ]);

  // ==========================================================
  // MAP CENTER
  // ==========================================================

  const mapCenter =
    useMemo(() => {
      if (!userDistrict) {
        // Peshawar fallback
        return [
          34.0151,
          71.5249,
        ];
      }

      return [
        Number(
          userDistrict.latitude
        ),

        Number(
          userDistrict.longitude
        ),
      ];
    }, [userDistrict]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <>
        <Topbar
          title={t(
            "ptPublicMapTitle"
          )}
          subtitle="Loading regional drought data..."
        />

        <main
          className="p-4 sm:p-8 public-page"
          dir="ltr"
        >
          <Card>
            <p className="text-sm text-ink/50">
              Loading nearby districts
              and real AgriWatch ML
              predictions...
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error ||
    !userDistrict
  ) {
    return (
      <>
        <Topbar
          title={t(
            "ptPublicMapTitle"
          )}
          subtitle="Regional drought map"
        />

        <main
          className="p-4 sm:p-8 public-page"
          dir="ltr"
        >
          <Card>
            <p className="font-display font-semibold">
              Unable to load
              regional map
            </p>

            <p className="text-sm text-ink/60 mt-2">
              {error ||
                `${USER_DISTRICT} was not found in map data.`}
            </p>
          </Card>
        </main>
      </>
    );
  }

  // ==========================================================
  // NORMALIZED DISPLAY VALUES
  // ==========================================================

  const displayProvince =
    normalizeProvince(
      userDistrict.province
    );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Topbar
        title={t(
          "ptPublicMapTitle"
        )}
        subtitle={`${userDistrict.district} — ${displayProvince}`}
      />

      <main
        className="p-4 sm:p-8 space-y-6 public-page"
        dir="ltr"
      >
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">Regional GIS monitoring</span>
            <h2 className="public-hero-title">Explore drought conditions around {userDistrict.district}</h2>
            <p className="public-hero-copy">Interactive regional monitoring using real AgriWatch Random Forest predictions and nearby-district context.</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>Your district</span><strong>{userDistrict.district}</strong></div>
            <div className="public-hero-stat"><span>Nearby districts</span><strong>{Math.max(regionalDistricts.length - 1, 0)}</strong></div>
            <div className="public-hero-stat"><span>Province</span><strong>{displayProvince}</strong></div>
          </div>
        </section>

        {/* ====================================================
            REGIONAL COVERAGE
        ==================================================== */}

        <Card className="public-data-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Regional Coverage
              </p>

              <p className="font-display font-semibold mt-1">
                {
                  userDistrict.district
                }{" "}
                +{" "}
                {Math.max(
                  regionalDistricts.length -
                    1,
                  0
                )}{" "}
                nearby districts
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Data Source
              </p>

              <p className="text-sm text-ink/60 mt-1">
                AgriWatch Random
                Forest ML
              </p>
            </div>
          </div>
        </Card>

        {/* ====================================================
            LEGEND
        ==================================================== */}

        <div className="flex items-center flex-wrap gap-5 text-xs text-ink/50">
          {Object.entries(
            riskColor
          ).map(
            ([
              level,
              color,
            ]) => (
              <span
                key={level}
                className="flex items-center gap-1.5"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{
                    background:
                      color,
                  }}
                />

                {level}
              </span>
            )
          )}

          <span className="text-ink/30">
            • Larger marker =
            your district
          </span>
        </div>

        {/* ====================================================
            REGIONAL MAP
        ==================================================== */}

        <Card className="p-0 public-map-shell">
          <MapContainer
            center={mapCenter}
            zoom={8}
            scrollWheelZoom={true}
            style={{
              height: "560px",
              width: "100%",
              zIndex: 1,
            }}
          >
            <MapController
              center={mapCenter}
            />

            {/* ================================================
                FREE OPENSTREETMAP BASEMAP

                No CARTO.
                No API key required.
                This fixes "API KEY REQUIRED".
            ================================================ */}

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              maxZoom={19}
            />

            {/* ================================================
                REAL ML DISTRICT MARKERS
            ================================================ */}

            {regionalDistricts.map(
              (district) => {
                const isUserDistrict =
                  district.district ===
                  userDistrict.district;

                const risk =
                  district.risk_level ||
                  "Low";

                const color =
                  riskColor[risk] ||
                  "#64748b";

                const probability =
                  getProbability(
                    district
                  );

                const province =
                  normalizeProvince(
                    district.province
                  );

                return (
                  <CircleMarker
                    key={`${district.province}-${district.district}`}
                    center={[
                      Number(
                        district.latitude
                      ),
                      Number(
                        district.longitude
                      ),
                    ]}
                    radius={
                      isUserDistrict
                        ? 16
                        : 11
                    }
                    pathOptions={{
                      color,

                      fillColor:
                        color,

                      fillOpacity:
                        isUserDistrict
                          ? 0.8
                          : 0.55,

                      weight:
                        isUserDistrict
                          ? 4
                          : 2,
                    }}
                  >
                    <Popup>
                      <div className="font-body text-sm min-w-[190px]">
                        <p className="font-semibold">
                          {
                            district.district
                          }
                        </p>

                        <p className="text-xs text-gray-500">
                          {province}
                        </p>

                        {isUserDistrict && (
                          <p className="text-xs font-semibold text-green-700 mt-2">
                            Your district
                          </p>
                        )}

                        <div className="mt-2 space-y-1">
                          <p>
                            Risk:{" "}
                            <strong>
                              {risk}
                            </strong>
                          </p>

                          <p>
                            Drought
                            probability:{" "}
                            <strong>
                              {probability.toFixed(
                                2
                              )}
                              %
                            </strong>
                          </p>

                          {!isUserDistrict && (
                            <p>
                              Distance:{" "}
                              <strong>
                                {district.distance_km.toFixed(
                                  1
                                )}{" "}
                                km
                              </strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              }
            )}
          </MapContainer>
        </Card>

        {/* ====================================================
            NEARBY DISTRICT LIST
        ==================================================== */}

        <Card>
          <p className="font-display font-semibold">
            Nearby drought
            conditions
          </p>

          <p className="text-xs text-ink/40 mt-1 mb-4">
            Showing your district
            and the nearest districts
            using real Random Forest
            predictions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {regionalDistricts.map(
              (district) => {
                const isUserDistrict =
                  district.district ===
                  userDistrict.district;

                const probability =
                  getProbability(
                    district
                  );

                const province =
                  normalizeProvince(
                    district.province
                  );

                return (
                  <div
                    key={`${district.province}-${district.district}`}
                    className={`public-district-tile ${isUserDistrict ? "is-current" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {
                            district.district
                          }
                        </p>

                        <p className="text-xs text-ink/40">
                          {
                            province
                          }
                        </p>
                      </div>

                      {isUserDistrict && (
                        <span className="text-[10px] uppercase font-semibold text-primary">
                          You
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <SeverityBadge
                        level={
                          district.risk_level ||
                          "Low"
                        }
                      />
                    </div>

                    <p className="text-xs text-ink/50 mt-2">
                      Drought risk:{" "}
                      <strong>
                        {probability.toFixed(
                          2
                        )}
                        %
                      </strong>
                    </p>

                    {!isUserDistrict && (
                      <p className="text-xs text-ink/40 mt-1">
                        {district.distance_km.toFixed(
                          1
                        )}{" "}
                        km away
                      </p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </Card>
      </main>
    </>
  );
}