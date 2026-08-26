const DEFAULT_API_URL = "https://expensetracker-production-eb69.up.railway.app";

export const API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/$/, "");

export function apiEndpoint(path) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
