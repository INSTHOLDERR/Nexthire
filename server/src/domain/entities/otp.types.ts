import { OTPSessionType } from './enums';

export { OTPSessionType };

export interface IOTPSession {
  _id: string;
  email: string;
  otp: string;
  type: OTPSessionType;
  createdAt: Date;
  expiresAt: Date;
  registrationExpiresAt?: Date;
  used: boolean;
  attemptCount: number;
  pendingPassword?: string;
}


export const OTP_SESSION_TTL_MS = 30 * 1000;


export const REGISTRATION_INTENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const OTP_MAX_ATTEMPTS = 5;
