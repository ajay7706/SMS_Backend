/**
 * Central API configuration
 * Uses environment variable VITE_API_URL if available, 
 * falls back to the production Render URL.
 */
const base = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000" : "https://sms-backend-i3a1.onrender.com");
export const API_BASE_URL = base.endsWith("/api") ? base : `${base}/api`;


export const ENDPOINTS = {
  AUTH: `${API_BASE_URL}/auth`,
  USERS: `${API_BASE_URL}/users`,
};
