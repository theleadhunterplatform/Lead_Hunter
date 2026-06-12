import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh calls at once
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('hunter_token');
      const orgId = localStorage.getItem('active_org_id');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (orgId) {
        config.headers['x-org-id'] = orgId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('hunter_refresh_token');

      if (!refreshToken) {
        // No refresh token, force logout
        handleLogout();
        return Promise.reject(error);
      }

      try {
        // Try to get new token pair
        const response = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
        const { access_token, refresh_token: newRefreshToken } = response.data.data || response.data;

        const tokenToStore = access_token || response.data.access_token;
        const refreshTokenToStore = newRefreshToken || response.data.refresh_token;

        localStorage.setItem('hunter_token', tokenToStore);
        localStorage.setItem('hunter_refresh_token', refreshTokenToStore);

        // Update the original request with the new token
        if (originalRequest.headers.set) {
          originalRequest.headers.set('Authorization', `Bearer ${tokenToStore}`);
        } else {
          originalRequest.headers['Authorization'] = `Bearer ${tokenToStore}`;
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${tokenToStore}`;
        processQueue(null, tokenToStore);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const handleLogout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hunter_token');
    localStorage.removeItem('hunter_refresh_token');
    localStorage.removeItem('hunter_user');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }
};

export default api;
