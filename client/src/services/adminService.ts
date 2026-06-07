import axios from 'axios';
import { AdminAction } from '../types';

const adminApi = axios.create({ baseURL: import.meta.env.VITE_API_URL as string });

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('nh_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const axiosError = error as import('axios').AxiosError;
    if (axiosError.response?.status === 401) {
      localStorage.removeItem('nh_admin_token');
      window.location.replace('/admin');
    }
    return Promise.reject(error);
  }
);

export interface SetStatusPayload {
  action: AdminAction;
  reason?: string;
  suspendDays?: string | number;
}

export interface ReviewAppealPayload {
  status: 'approved' | 'rejected';
  adminMsg: string;
}

export const adminLogin   = (data: { email: string; password: string })    => adminApi.post('/admin/login', data);
export const getUsers     = (params?: Record<string, unknown>)             => adminApi.get('/admin/users', { params });
export const setStatus    = (userId: string, data: SetStatusPayload)       => adminApi.patch(`/admin/users/${userId}/status`, data);
export const getAppeals   = ()                                             => adminApi.get('/admin/appeals');
export const reviewAppeal = (appealId: string, data: ReviewAppealPayload)  => adminApi.patch(`/admin/appeals/${appealId}/review`, data);
export const getUserAppeals = (userId: string)                             => adminApi.get(`/admin/appeals/user/${userId}`);
