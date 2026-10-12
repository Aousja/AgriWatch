// Placeholder data — structured to match the real API responses
// that will come from FastAPI + PostGIS once the backend is connected.

export const districts = [
  { id: 1, name: "Bahawalpur", province: "Punjab", lat: 29.4, lng: 71.68, severity: "Severe", ndvi: 0.21, spi3: -1.8, soilMoisture: 14 },
  { id: 2, name: "Thar (Tharparkar)", province: "Sindh", lat: 24.88, lng: 70.26, severity: "Extreme", ndvi: 0.12, spi3: -2.3, soilMoisture: 8 },
  { id: 3, name: "Khairpur", province: "Sindh", lat: 27.53, lng: 68.76, severity: "Severe", ndvi: 0.24, spi3: -1.6, soilMoisture: 16 },
  { id: 4, name: "Dera Ghazi Khan", province: "Punjab", lat: 30.05, lng: 70.64, severity: "Moderate", ndvi: 0.35, spi3: -0.9, soilMoisture: 22 },
  { id: 5, name: "Quetta", province: "Balochistan", lat: 30.18, lng: 66.99, severity: "Extreme", ndvi: 0.15, spi3: -2.1, soilMoisture: 10 },
  { id: 6, name: "Chaghi", province: "Balochistan", lat: 29.29, lng: 63.9, severity: "Extreme", ndvi: 0.09, spi3: -2.6, soilMoisture: 6 },
  { id: 7, name: "Multan", province: "Punjab", lat: 30.16, lng: 71.47, severity: "Moderate", ndvi: 0.38, spi3: -0.7, soilMoisture: 25 },
  { id: 8, name: "Peshawar", province: "KP", lat: 34.0, lng: 71.57, severity: "Normal", ndvi: 0.52, spi3: 0.2, soilMoisture: 34 },
  { id: 9, name: "Sukkur", province: "Sindh", lat: 27.7, lng: 68.86, severity: "Moderate", ndvi: 0.33, spi3: -1.1, soilMoisture: 20 },
  { id: 10, name: "Faisalabad", province: "Punjab", lat: 31.42, lng: 73.08, severity: "Normal", ndvi: 0.49, spi3: 0.4, soilMoisture: 31 },
  { id: 11, name: "Larkana", province: "Sindh", lat: 27.56, lng: 68.21, severity: "Severe", ndvi: 0.22, spi3: -1.7, soilMoisture: 15 },
  { id: 12, name: "Kalat", province: "Balochistan", lat: 29.03, lng: 66.59, severity: "Severe", ndvi: 0.19, spi3: -1.9, soilMoisture: 12 },
];

export const severityColor = {
  Normal: "#3F8C2C",
  Moderate: "#D98A1F",
  Severe: "#C1442D",
  Extreme: "#7A1F13",
};

export const trendData = [
  { month: "Aug", ndvi: 0.47, spi3: 0.1, soilMoisture: 32 },
  { month: "Sep", ndvi: 0.46, spi3: 0.0, soilMoisture: 31 },
  { month: "Oct", ndvi: 0.44, spi3: -0.1, soilMoisture: 30 },
  { month: "Nov", ndvi: 0.43, spi3: -0.2, soilMoisture: 29 },
  { month: "Dec", ndvi: 0.42, spi3: -0.3, soilMoisture: 28 },
  { month: "Jan", ndvi: 0.42, spi3: -0.3, soilMoisture: 28 },
  { month: "Feb", ndvi: 0.41, spi3: -0.4, soilMoisture: 27 },
  { month: "Mar", ndvi: 0.38, spi3: -0.6, soilMoisture: 25 },
  { month: "Apr", ndvi: 0.34, spi3: -0.9, soilMoisture: 22 },
  { month: "May", ndvi: 0.29, spi3: -1.3, soilMoisture: 19 },
  { month: "Jun", ndvi: 0.24, spi3: -1.7, soilMoisture: 16 },
  { month: "Jul", ndvi: 0.21, spi3: -1.9, soilMoisture: 14 },
];

export const predictionData = [
  { day: "Day 5", risk: 62, confidence: 88 },
  { day: "Day 10", risk: 66, confidence: 85 },
  { day: "Day 15", risk: 71, confidence: 81 },
  { day: "Day 20", risk: 75, confidence: 78 },
  { day: "Day 25", risk: 79, confidence: 74 },
  { day: "Day 30", risk: 83, confidence: 70 },
];

export const alerts = [
  { id: "AL-1042", district: "Tharparkar", severity: "Extreme", message: "Extreme drought conditions detected. Immediate water conservation advised.", sentTo: "Farmers + Public", date: "2026-07-15", status: "Delivered" },
  { id: "AL-1041", district: "Quetta", severity: "Extreme", message: "Soil moisture critically low. Irrigation scheduling recommended.", sentTo: "Farmers", date: "2026-07-14", status: "Delivered" },
  { id: "AL-1040", district: "Bahawalpur", severity: "Severe", message: "Rainfall deficit of 42% this month. Monitor crop stress closely.", sentTo: "Farmers + Public", date: "2026-07-12", status: "Delivered" },
  { id: "AL-1039", district: "Multan", severity: "Moderate", message: "Early signs of moisture stress in cotton belt.", sentTo: "Farmers", date: "2026-07-10", status: "Delivered" },
  { id: "AL-1038", district: "Chaghi", severity: "Extreme", message: "District entering extreme drought category. Emergency water tankers dispatched.", sentTo: "Farmers + Public", date: "2026-07-08", status: "Delivered" },
];

export const users = [
  { id: "U-3021", name: "Muhammad Aslam", role: "Farmer", district: "Bahawalpur", crop: "Cotton", farmSize: "8 acres", registered: "2026-05-02" },
  { id: "U-3022", name: "Rukhsana Bibi", role: "Farmer", district: "Sukkur", crop: "Rice", farmSize: "4 acres", registered: "2026-05-04" },
  { id: "U-3023", name: "—", role: "General Public", district: "Peshawar", crop: "-", farmSize: "-", registered: "2026-05-09" },
  { id: "U-3024", name: "Imran Khoso", role: "Farmer", district: "Larkana", crop: "Wheat", farmSize: "12 acres", registered: "2026-05-11" },
  { id: "U-3025", name: "Ayesha Noor", role: "General Public", district: "Multan", crop: "-", farmSize: "-", registered: "2026-05-15" },
  { id: "U-3026", name: "Ghulam Rasool", role: "Farmer", district: "Khairpur", crop: "Sugarcane", farmSize: "6 acres", registered: "2026-05-18" },
  { id: "U-3027", name: "Zahid Officer", role: "Admin / PDMA", district: "Quetta", crop: "-", farmSize: "-", registered: "2026-04-20" },
];

export const complaints = [
  { id: "CMP-501", farmer: "Muhammad Aslam", district: "Bahawalpur", category: "Crop Failure", status: "Under Review", date: "2026-07-14" },
  { id: "CMP-502", farmer: "Imran Khoso", district: "Larkana", category: "Irrigation Shortage", status: "Forwarded", date: "2026-07-12" },
  { id: "CMP-503", farmer: "Rukhsana Bibi", district: "Sukkur", category: "Livestock Loss", status: "Resolved", date: "2026-07-05" },
  { id: "CMP-504", farmer: "Ghulam Rasool", district: "Khairpur", category: "Crop Failure", status: "Under Review", date: "2026-07-16" },
];

export const publicRegByDistrict = [
  { district: "Peshawar", count: 148 },
  { district: "Multan", count: 96 },
  { district: "Quetta", count: 74 },
  { district: "Faisalabad", count: 122 },
  { district: "Sukkur", count: 58 },
];

// ---- Farmer-facing data ----

export const currentFarmer = {
  name: "Muhammad Aslam",
  district: "Bahawalpur",
  tehsil: "Ahmedpur East",
  crop: "Cotton",
  farmSize: "8 acres",
  language: "English",
};

// ---- Demo fallback profiles for the other two portals ----
// Used the same way as currentFarmer: only shown when nobody actually
// signed in via Google (the phone/OTP demo flow doesn't create a Supabase
// session), so the topbar still has something sensible to display instead
// of leaving the profile blank. Reuses the matching row already seeded in
// `users` above so the demo data stays internally consistent.

export const currentOfficer = {
  name: "Zahid Officer",
  district: "Quetta",
};

export const currentPublicUser = {
  name: "Ayesha Noor",
  district: "Multan",
};

export const cropRecommendations = [
  { id: 1, title: "Delay next irrigation by 3 days", detail: "Soil moisture is still above wilting point for cotton at this growth stage. Delaying saves water without stressing the crop." },
  { id: 2, title: "Apply light mulching", detail: "Reduces evaporation loss given the current SPI-3 rainfall deficit in Bahawalpur district." },
  { id: 3, title: "Monitor for early pest stress", detail: "Drought-stressed cotton is more susceptible to whitefly. Inspect undersides of leaves weekly." },
  { id: 4, title: "Consider partial shade netting", detail: "For young plants only, if temperatures cross 42°C in the next 7-day forecast." },
];

export const irrigationForecast = [
  { day: "Mon", rainfallMm: 0, temp: 39, action: "Irrigate" },
  { day: "Tue", rainfallMm: 0, temp: 40, action: "Irrigate" },
  { day: "Wed", rainfallMm: 2, temp: 38, action: "Hold" },
  { day: "Thu", rainfallMm: 0, temp: 41, action: "Irrigate" },
  { day: "Fri", rainfallMm: 0, temp: 41, action: "Hold" },
  { day: "Sat", rainfallMm: 4, temp: 37, action: "Hold" },
  { day: "Sun", rainfallMm: 0, temp: 39, action: "Irrigate" },
];

export const yieldRisk = {
  score: "High",
  percent: 68,
  factors: [
    "SPI-3 rainfall deficit of 38% this season",
    "Soil moisture 14%, below the 20% threshold for cotton boll development",
    "NDVI trending down over the last 3 satellite passes",
  ],
  mitigation: [
    "Prioritize irrigation during flowering/boll stage over vegetative stage",
    "Apply potassium-based fertilizer to improve drought tolerance",
    "Register any crop damage through the Complaints tab for PDMA assistance",
  ],
};

export const cropCalendar = [
  { crop: "Wheat", season: "Rabi", sowing: "Nov – Dec", irrigation: "4-5 irrigations, crown root stage critical", fertilizer: "DAP at sowing, Urea at first irrigation", diseaseWatch: "Yellow rust — Jan to Feb" },
  { crop: "Cotton", season: "Kharif", sowing: "May – Jun", irrigation: "6-8 irrigations, avoid waterlogging", fertilizer: "NPK split at sowing, squaring, flowering", diseaseWatch: "Whitefly & CLCV — Jul to Sep" },
  { crop: "Sugarcane", season: "Year-round (Feb/Sep planting)", sowing: "Feb–Mar or Sep–Oct", irrigation: "Every 10-15 days in summer", fertilizer: "Heavy nitrogen requirement, split doses", diseaseWatch: "Red rot — monsoon months" },
  { crop: "Rice", season: "Kharif", sowing: "Jun – Jul", irrigation: "Continuous flooding preferred, 5-6cm standing water", fertilizer: "Urea in 3 splits", diseaseWatch: "Blast & bacterial blight — Aug" },
];

// ---- Public / awareness data ----

export const awarenessTips = [
  { id: 1, title: "Store rainwater when it comes", body: "Simple household rainwater harvesting can offset up to 15% of dry-season water needs in drought-prone districts." },
  { id: 2, title: "Fix leaking taps and pipes", body: "A single dripping tap can waste over 15 liters of water a day — significant in water-stressed regions." },
  { id: 3, title: "Support local drought-resistant crops", body: "Millets and sorghum use up to 30% less water than traditional staples and are well suited to arid districts." },
  { id: 4, title: "Know your district's alert level", body: "Check the Regional Map regularly — early awareness helps communities plan before water shortages become critical." },
];

export const guestSummary = {
  districtsMonitored: 12,
  extremeCount: 3,
  lastUpdate: "10 days ago (satellite pass)",
};
