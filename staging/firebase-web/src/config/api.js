// Central AgriWatch FastAPI base URL.
// Production can override this with VITE_API_BASE_URL in Vercel.
// If no variable is provided, the deployed AgriWatch backend is used.
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://agri-watch-backend.vercel.app"
).replace(/\/$/, "");

export default API_BASE_URL;
