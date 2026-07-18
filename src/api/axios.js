// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://restopos-backend-fj8n.onrender.com/api",
  timeout: 10000,
  withCredentials: true, // send/receive the httpOnly auth cookie
});

// Nuke Content-Type from all default header slots at creation time
delete API.defaults.headers.common["Content-Type"];
delete API.defaults.headers.post["Content-Type"];
delete API.defaults.headers.patch["Content-Type"];
delete API.defaults.headers.put["Content-Type"];

API.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      // Setting to undefined (not delete) ensures axios skips it entirely
      // and lets the browser set multipart/form-data with the correct boundary
      config.headers["Content-Type"] = undefined;
    } else {
      // Explicitly set JSON for non-FormData requests
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Redirect to staff login on session expiry
API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.code === "ECONNABORTED" || !error.response) {
      console.warn("Network error or timeout:", error.message);
    } else if (error.response?.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else {
      console.error("API Error:", error?.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default API;
