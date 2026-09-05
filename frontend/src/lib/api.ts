import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ─── Request Interceptor — Attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pp360_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pp360_token');
      localStorage.removeItem('pp360_user');
      const currentPath = window.location.pathname;
      const isAuthRoute =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/forgot-password') ||
        currentPath.startsWith('/reset-password');
      const isAuthApi = error.config?.url?.includes('/auth/');
      if (!isAuthRoute && !isAuthApi) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
