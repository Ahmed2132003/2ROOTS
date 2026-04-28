import axios from 'axios';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || localStorage.getItem('access');
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || localStorage.getItem('refresh');
}

export function persistTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.removeItem('access');
  }

  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.removeItem('refresh');
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;
      const refresh = getRefreshToken();

      if (refresh) {
        try {
          const res = await axios.post('/api/auth/token/refresh/', { refresh });
          persistTokens({ access: res.data.access, refresh });
          original.headers.Authorization = `Bearer ${res.data.access}`;
          return api(original);
        } catch {
          clearTokens();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;