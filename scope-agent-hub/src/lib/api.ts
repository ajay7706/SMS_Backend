/**
 * Central API configuration
 * Uses environment variable VITE_API_URL if available, 
 * falls back to the production Render URL.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://sms-backend-i3a1.onrender.com/api";

export const ENDPOINTS = {
  AUTH: `${API_BASE_URL}/auth`,
  USERS: `${API_BASE_URL}/users`,
};
