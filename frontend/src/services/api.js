// services/api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
});

// ---- attach access token ----
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ccba_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- refresh on 401 ----
let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config._retry) {
      const refresh = localStorage.getItem("ccba_refresh_token");
      if (!refresh) return Promise.reject(error);

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, config });
        });
      }

      config._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        localStorage.setItem("ccba_access_token", data.access);
        queue.forEach((p) => p.resolve(api(p.config)));
        queue = [];
        isRefreshing = false;
        return api(config);
      } catch (err) {
        isRefreshing = false;
        queue = [];
        localStorage.removeItem("ccba_access_token");
        localStorage.removeItem("ccba_refresh_token");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
export const authAPI = {
  login: (credentials) => api.post("/auth/login/", credentials),
  refresh: (refresh) => api.post("/auth/refresh/", { refresh }),
  me: () => api.get("/auth/me/"),
};

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------
export const productsAPI = {
  list: (params) => api.get("/products/", { params }),
  get: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post("/products/", data),
  update: (id, data) => api.put(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
};

// ---------------------------------------------------------------------------
// REGIONS
// ---------------------------------------------------------------------------
export const regionsAPI = {
  list: (params) => api.get("/regions/", { params }),
  get: (id) => api.get(`/regions/${id}/`),
  create: (data) => api.post("/regions/", data),
  update: (id, data) => api.put(`/regions/${id}/`, data),
  delete: (id) => api.delete(`/regions/${id}/`),
};

// ---------------------------------------------------------------------------
// SALES
// ---------------------------------------------------------------------------
export const salesAPI = {
  list: (params) => api.get("/sales/", { params }),
  get: (id) => api.get(`/sales/${id}/`),
  create: (data) => api.post("/sales/", data),
  update: (id, data) => api.put(`/sales/${id}/`, data),
  delete: (id) => api.delete(`/sales/${id}/`),
  bulkUpload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/sales/bulk-upload/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ---------------------------------------------------------------------------
// WEATHER / HOLIDAYS / EVENTS
// ---------------------------------------------------------------------------
export const weatherAPI = {
  list: (params) => api.get("/weather/", { params }),
  create: (data) => api.post("/weather/", data),
};

export const holidaysAPI = {
  list: (params) => api.get("/holidays/", { params }),
  create: (data) => api.post("/holidays/", data),
  update: (id, data) => api.put(`/holidays/${id}/`, data),
  delete: (id) => api.delete(`/holidays/${id}/`),
};

export const eventsAPI = {
  list: (params) => api.get("/events/", { params }),
  create: (data) => api.post("/events/", data),
  update: (id, data) => api.put(`/events/${id}/`, data),
  delete: (id) => api.delete(`/events/${id}/`),
};

// ---------------------------------------------------------------------------
// FORECASTING
// ---------------------------------------------------------------------------
export const forecastsAPI = {
  list: (params) => api.get("/forecasts/", { params }),
  get: (id) => api.get(`/forecasts/${id}/`),
  generate: (payload) => api.post("/forecasts/generate/", payload),
  accuracy: () => api.get("/forecasts/accuracy/"),
};

export const forecastModelsAPI = {
  list: (params) => api.get("/forecast-models/", { params }),
};

// ---------------------------------------------------------------------------
// RECOMMENDATIONS
// ---------------------------------------------------------------------------
export const recommendationsAPI = {
  list: (params) => api.get("/recommendations/", { params }),
  markRead: (id) => api.post(`/recommendations/${id}/mark-read/`),
};

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------
export const reportsAPI = {
  list: (params) => api.get("/reports/", { params }),
  generate: (payload) => api.post("/reports/generate/", payload),
};

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
export const dashboardAPI = {
  summary: () => api.get("/dashboard/summary/"),
};