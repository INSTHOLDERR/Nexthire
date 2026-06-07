import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL as string });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nh_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const axiosError = error as import('axios').AxiosError<{ code?: string; data?: unknown }>;
    const res = axiosError.response?.data;
    const url = axiosError.config?.url || '';

    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/google') ||
      url.includes('/auth/verify-otp');

    if (axiosError.response?.status === 403 && !isAuthRoute) {
      if (res?.code === 'BANNED') {
        const u = JSON.parse(localStorage.getItem('nh_user') || 'null');
        if (u) localStorage.setItem('nh_user', JSON.stringify({ ...u, status: 'banned' }));
        sessionStorage.setItem('nh_banned_state', JSON.stringify(res.data || {}));
        window.location.replace('/banned');
        return new Promise(() => {});
      }
      if (res?.code === 'SUSPENDED') {
        const u = JSON.parse(localStorage.getItem('nh_user') || 'null');
        if (u) localStorage.setItem('nh_user', JSON.stringify({ ...u, status: 'suspended' }));
        sessionStorage.setItem('nh_suspended_state', JSON.stringify(res.data || {}));
        window.location.replace('/suspended');
        return new Promise(() => {});
      }
    }

    return Promise.reject(error);
  }
);

export default api;
