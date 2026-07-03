import { OTPSessionType } from './enums';

export { OTPSessionType };

export interface IOTPSession {
  _id: string;
  email: string;
  otp: string;
  type: OTPSessionType;

  /** Session start — reset on every fresh send or resend. */
  createdAt: Date;

  /** createdAt + OTP_SESSION_TTL_MS. Recalculated on every reset, never extended. */
  expiresAt: Date;

  /**
   * Independent from `expiresAt` — tracks how long the registration ITSELF
   * (and the hashed password it's holding onto) stays valid, separate from
   * how long the current 6-digit code is valid. Only set for email_verify
   * sessions created during registration. This is what makes resend able to
   * recover even after the OTP code itself has expired.
   */
  registrationExpiresAt?: Date;

  used: boolean;

  /** Wrong-attempt counter for this session. Locks out after OTP_MAX_ATTEMPTS. */
  attemptCount: number;

  /** Only present for email_verify sessions created during registration. */
  pendingPassword?: string;
}

/** 30-second OTP code window — how long a single 6-digit code stays valid. */
export const OTP_SESSION_TTL_MS = 30 * 1000;

/**
 * How long a pending registration (the hashed password, stored before email
 * is verified) survives, independent of the much shorter OTP code window
 * above. Without this, resend could never recover from an expired code —
 * the hashed password would already be gone by the time the user clicked
 * "resend," forcing them to register from scratch every time the code timed
 * out. This window is intentionally longer than OTP_SESSION_TTL_MS so resend
 * can always succeed as long as the user hasn't abandoned registration
 * entirely for an extended period.
 */
export const REGISTRATION_INTENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Wrong guesses allowed before the session is locked and a new OTP must be requested. */
export const OTP_MAX_ATTEMPTS = 5;
