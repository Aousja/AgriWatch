import { useMemo } from "react";

import Topbar from "../components/Topbar";
import Card from "../components/Card";
import { useLanguage } from "../i18n/LanguageContext";

import {
  CalendarDays,
  Sprout,
  Droplets,
  Leaf,
  ShieldAlert,
  Sparkles,
  MapPin,
} from "lucide-react";

// ============================================================
// TEMPORARY REGION
// Later this comes from logged-in user's profile.
// ============================================================

const USER_DISTRICT = "Peshawar District";
const USER_PROVINCE = "Khyber Pakhtunkhwa";

// ============================================================
// CROP CALENDAR RULES
//
// These are crop-calendar guidance records.
// They are NOT Random Forest predictions.
//
// Later move these to the backend crop recommendation /
// PARC-FAO rules module.
// ============================================================

const cropCalendarData = [
  {
    crop: "Wheat",
    season: "Rabi",
    sowing: "October – December",
    sowingMonths: [10, 11, 12],
    harvest: "April – May",
    irrigation:
      "Irrigate according to soil moisture, with particular attention around crown-root initiation, flowering and grain development.",
    fertilizer:
      "Apply fertilizer according to soil condition and local agricultural recommendations. Split nitrogen applications where appropriate.",
    diseaseWatch:
      "Monitor for rust, aphids and other locally reported wheat diseases or pests.",
  },

  {
    crop: "Maize",
    season: "Kharif / Spring",
    sowing: "February – March or June – July",
    sowingMonths: [2, 3, 6, 7],
    harvest: "May – June / September – October",
    irrigation:
      "Avoid prolonged moisture stress, particularly during flowering and grain formation.",
    fertilizer:
      "Base fertilizer use on soil condition and local extension guidance. Avoid unnecessary application during severe water stress.",
    diseaseWatch:
      "Watch for stem borers, leaf diseases and signs of heat or moisture stress.",
  },

  {
    crop: "Sugarcane",
    season: "Annual",
    sowing: "February – March",
    sowingMonths: [2, 3],
    harvest: "Following maturity",
    irrigation:
      "Maintain adequate soil moisture while avoiding waterlogging. Irrigation demand increases during hot and dry periods.",
    fertilizer:
      "Use soil-based nutrient management and split applications according to crop stage.",
    diseaseWatch:
      "Monitor for borers, red rot and other locally reported sugarcane problems.",
  },

  {
    crop: "Rice",
    season: "Kharif",
    sowing: "May – July",
    sowingMonths: [5, 6, 7],
    harvest: "September – November",
    irrigation:
      "Maintain adequate water during establishment and reproductive growth while avoiding unnecessary water loss.",
    fertilizer:
      "Apply nutrients according to soil condition, crop stage and local agricultural recommendations.",
    diseaseWatch:
      "Monitor for blast, bacterial diseases, stem borers and other locally reported rice problems.",
  },

  {
    crop: "Potato",
    season: "Rabi / Autumn",
    sowing: "September – November",
    sowingMonths: [9, 10, 11],
    harvest: "January – March",
    irrigation:
      "Keep soil moisture reasonably consistent, especially during tuber formation, while avoiding waterlogging.",
    fertilizer:
      "Use balanced fertilizer according to soil condition and crop requirements.",
    diseaseWatch:
      "Monitor for late blight, early blight, aphids and tuber-related disease symptoms.",
  },

  {
    crop: "Vegetables",
    season: "Seasonal",
    sowing: "Varies by vegetable and season",
    sowingMonths: [],
    harvest: "Varies by crop",
    irrigation:
      "Use frequent but efficient irrigation according to crop type, soil moisture and temperature.",
    fertilizer:
      "Use crop-specific nutrient management and avoid excessive fertilizer application.",
    diseaseWatch:
      "Inspect crops regularly for insects, fungal disease, wilting and heat or drought stress.",
  },
];

// ============================================================
// MONTH NAME
// ============================================================

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CropCalendar() {
  const { t } = useLanguage();

  const currentMonth =
    new Date().getMonth() + 1;

  const currentMonthName =
    MONTH_NAMES[currentMonth - 1];

  // ==========================================================
  // SORT CROPS:
  // crops currently in sowing window first
  // ==========================================================

  const crops = useMemo(() => {
    return [...cropCalendarData].sort(
      (a, b) => {
        const aActive =
          a.sowingMonths.includes(
            currentMonth
          );

        const bActive =
          b.sowingMonths.includes(
            currentMonth
          );

        if (aActive && !bActive) {
          return -1;
        }

        if (!aActive && bActive) {
          return 1;
        }

        return a.crop.localeCompare(
          b.crop
        );
      }
    );
  }, [currentMonth]);

  return (
    <>
      <Topbar
        title={t("ptCropCalendarTitle")}
        subtitle={`${USER_DISTRICT} — ${USER_PROVINCE}`}
      />

      <main className="farmer-page p-4 sm:p-8 space-y-6">
        <section className="farmer-page-hero" dir="ltr">
          <div className="farmer-hero-content">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="farmer-hero-eyebrow"><Sparkles size={13} /> Seasonal crop planning</span>
                <h2 className="farmer-hero-title">Crop calendar for {USER_DISTRICT}</h2>
                <p className="farmer-hero-copy">Use regional sowing and harvest windows as a planning reference alongside AgriWatch drought and irrigation guidance.</p>
                <div className="farmer-hero-actions">
                  <span className="farmer-hero-button"><MapPin size={14} /> {USER_PROVINCE}</span>
                  <span className="farmer-hero-button"><CalendarDays size={14} /> {currentMonthName}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"><Sprout size={22} /></div>
            </div>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Calendar crops</span><strong>{crops.length}</strong></div>
              <div className="farmer-hero-stat"><span>Sowing now</span><strong>{crops.filter((crop) => crop.sowingMonths.includes(currentMonth)).length}</strong></div>
              <div className="farmer-hero-stat"><span>Current month</span><strong>{currentMonthName}</strong></div>
            </div>
          </div>
        </section>

        {/* ====================================================
            REGIONAL INFORMATION
        ==================================================== */}

        <Card scan dir="ltr">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs uppercase text-ink/40 font-medium">
                Regional Crop Calendar
              </p>

              <p className="font-display font-semibold mt-1">
                {USER_DISTRICT}
              </p>

              <p className="text-sm text-ink/50 mt-1">
                {USER_PROVINCE}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays
                  size={19}
                  className="text-primary"
                />
              </div>

              <div>
                <p className="text-xs uppercase text-ink/40 font-medium">
                  Current Month
                </p>

                <p className="font-medium">
                  {currentMonthName}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ====================================================
            CURRENT SOWING WINDOW SUMMARY
        ==================================================== */}

        <Card dir="ltr">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sprout
                size={17}
                className="text-primary"
              />
            </div>

            <div>
              <p className="font-medium text-sm">
                Current sowing windows
              </p>

              <p className="text-sm text-ink/55 mt-1">
                {crops.filter((crop) =>
                  crop.sowingMonths.includes(
                    currentMonth
                  )
                ).length > 0
                  ? crops
                      .filter((crop) =>
                        crop.sowingMonths.includes(
                          currentMonth
                        )
                      )
                      .map((crop) => crop.crop)
                      .join(", ")
                  : "No listed major crop has a standard sowing window this month."}
              </p>
            </div>
          </div>
        </Card>

        {/* ====================================================
            CROP CARDS
        ==================================================== */}

        {crops.map((crop) => {
          const sowingNow =
            crop.sowingMonths.includes(
              currentMonth
            );

          return (
            <Card
              key={crop.crop}
              dir="ltr"
              className="farmer-form-card"
            >
              {/* HEADER */}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold">
                      {crop.crop}
                    </p>

                    {sowingNow && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Sowing Now
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink/40 mt-1">
                    {USER_PROVINCE}
                  </p>
                </div>

                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {crop.season}
                </span>
              </div>

              {/* DETAILS */}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 text-sm">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sprout
                      size={14}
                      className="text-primary"
                    />

                    <p className="text-xs uppercase text-ink/40 font-medium">
                      Sowing Window
                    </p>
                  </div>

                  <p className="text-ink/70">
                    {crop.sowing}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CalendarDays
                      size={14}
                      className="text-primary"
                    />

                    <p className="text-xs uppercase text-ink/40 font-medium">
                      Harvest
                    </p>
                  </div>

                  <p className="text-ink/70">
                    {crop.harvest}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Droplets
                      size={14}
                      className="text-primary"
                    />

                    <p className="text-xs uppercase text-ink/40 font-medium">
                      Irrigation
                    </p>
                  </div>

                  <p className="text-ink/70">
                    {crop.irrigation}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Leaf
                      size={14}
                      className="text-primary"
                    />

                    <p className="text-xs uppercase text-ink/40 font-medium">
                      Fertilizer
                    </p>
                  </div>

                  <p className="text-ink/70">
                    {crop.fertilizer}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldAlert
                      size={14}
                      className="text-primary"
                    />

                    <p className="text-xs uppercase text-ink/40 font-medium">
                      Disease Watch
                    </p>
                  </div>

                  <p className="text-ink/70">
                    {crop.diseaseWatch}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}

        {/* ====================================================
            DISCLAIMER
        ==================================================== */}

        <Card dir="ltr">
          <p className="text-xs text-ink/45 leading-relaxed">
            Crop timing can vary with local climate,
            elevation, crop variety and field conditions.
            This calendar provides general regional guidance.
            Final sowing, irrigation and fertilizer decisions
            should follow local agricultural extension
            recommendations and field conditions.
          </p>
        </Card>
      </main>
    </>
  );
}