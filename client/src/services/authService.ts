import api from './api';

export interface RegisterPayload   { email: string; password: string }
export interface LoginPayload      { email: string; password: string }
export interface VerifyOTPPayload  { email: string; otp: string; type: string }
export interface ForgotPayload     { email: string }
export interface ResetPayload      { email: string; newPassword: string }

export const register       = (data: RegisterPayload)     => api.post('/auth/register', data);
export const login          = (data: LoginPayload)        => api.post('/auth/login', data);
export const verifyOTP      = (data: VerifyOTPPayload)    => api.post('/auth/verify-otp', data);
export const googleAuth     = (idToken: string)           => api.post('/auth/google', { idToken });
export const forgotPassword = (data: ForgotPayload)       => api.post('/auth/forgot-password', data);
export const resetPassword  = (data: ResetPayload)        => api.post('/auth/reset-password', data);
export const resendEmailVerifyOTP = (email: string)       => api.post('/auth/resend-otp', { email });
export const setupProfile   = (formData: FormData)        =>
  api.put('/profile/setup', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getMyAppeals   = (userId: string)            => api.get(`/admin/appeals/user/${userId}`);
export const resendLoginOTP = (data: LoginPayload)        => api.post('/auth/login', data);
