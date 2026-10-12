const KEY = "agriwatch_recent_districts";
const MAX = 5;

export function getRecentDistrictIds() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentDistrict(id) {
  try {
    const current = getRecentDistrictIds().filter((x) => String(x) !== String(id));
    current.unshift(id);
    localStorage.setItem(KEY, JSON.stringify(current.slice(0, MAX)));
  } catch {
    // storage unavailable — recently viewed just won't persist
  }
}
