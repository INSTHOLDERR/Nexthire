export type OTPSessionType = 'email_verify' | 'forgot_password' | 'login_verify';

export interface IOTPSession {
  _id: string;
  email: string;
  otp: string;
  type: OTPSessionType;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  attemptCount: number;
  pendingPassword?: string;
}

export const OTP_SESSION_TTL_MS = 3 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
