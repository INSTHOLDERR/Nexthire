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
    const isLoginRequest = axiosError.config?.url?.includes('/admin/login');
    // A failed LOGIN attempt also returns 401 — that must NOT trigger the
    // session-expired redirect, otherwise the page reloads before the
    // "Invalid credentials" toast can ever be shown.
    if (axiosError.response?.status === 401 && !isLoginRequest) {
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

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export interface GetAppealsParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export const adminLogin     = (data: { email: string; password: string })     => adminApi.post('/admin/login', data);
export const getUsers       = (params?: GetUsersParams)                       => adminApi.get('/admin/users', { params });
export const setStatus      = (userId: string, data: SetStatusPayload)        => adminApi.patch(`/admin/users/${userId}/status`, data);
export const getAppeals     = (params?: GetAppealsParams)                     => adminApi.get('/admin/appeals', { params });
export const reviewAppeal   = (appealId: string, data: ReviewAppealPayload)   => adminApi.patch(`/admin/appeals/${appealId}/review`, data);
export const getUserAppeals = (userId: string)                                => adminApi.get(`/admin/appeals/user/${userId}`);

// ── Moderation: reports & warnings ───────────────────────────────────────────
export interface GetReportsParams { page?: number; targetType?: 'post' | 'user'; status?: string }
export const getReports          = (params?: GetReportsParams) => adminApi.get('/admin/reports', { params });
export const actionReport        = (reportId: string, data: { action: 'dismiss' | 'warn' | 'suspend_post' | 'suspend_user' | 'ban_user'; adminNote?: string }) => adminApi.patch(`/admin/reports/${reportId}/action`, data);
export const getWarnings         = (params?: { page?: number; appealStatus?: string }) => adminApi.get('/admin/warnings', { params });
export const reviewWarningAppeal = (id: string, data: { decision: 'approved' | 'rejected'; adminNote?: string }) => adminApi.patch(`/admin/warnings/${id}/appeal-review`, data);
export const revokeWarning       = (id: string) => adminApi.patch(`/admin/warnings/${id}/revoke`);

// ── Dashboard stats & post management ────────────────────────────────────────
export const getAdminStats   = () => adminApi.get('/admin/stats');
export const getAdminPosts   = (params?: { page?: number; limit?: number }) => adminApi.get('/posts/admin/posts', { params });
export const setAdminPostStatus = (postId: string, data: { status: 'active' | 'suspended' | 'removed'; adminNote?: string }) => adminApi.patch(`/posts/admin/posts/${postId}/status`, data);
export const deleteAdminPost = (postId: string) => adminApi.delete(`/posts/admin/posts/${postId}`);

// ── Detail views ─────────────────────────────────────────────────────────────
export const getUserDetail = (userId: string) => adminApi.get(`/admin/users/${userId}/detail`);
export const getPostDetail = (postId: string) => adminApi.get(`/admin/posts/${postId}/detail`);

// ── Per-target overviews (Users / Posts drawers) ─────────────────────────────
export const getUserOverview = (userId: string) => adminApi.get(`/admin/users/${userId}/overview`);
export const getPostOverview = (postId: string) => adminApi.get(`/admin/posts/${postId}/overview`);

export const getModerationQueue = () => adminApi.get('/admin/moderation-queue');

// ── Admin notification feed ──────────────────────────────────────────────────
export interface AdminNotification { _id: string; type: string; message: string; refType?: string | null; refId?: string | null; read: boolean; createdAt: string }
export const getAdminNotifications = () => adminApi.get('/admin/notifications');
export const markAdminNotificationsRead = () => adminApi.patch('/admin/notifications/read-all');
