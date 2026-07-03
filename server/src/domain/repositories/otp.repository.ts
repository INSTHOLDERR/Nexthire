import { IOTPSession, OTPSessionType } from '../entities/otp.types';

/**
 * Every create/resend call here REPLACES any prior session for the same
 * email+type with a brand-new 3-minute window. There is no "extend" —
 * only "reset to a fresh session."
 */
export interface IOTPRepository {
  createOrReset(email: string, otp: string, type: OTPSessionType): Promise<IOTPSession>;

  createOrResetPendingRegistration(
    email: string,
    otp: string,
    hashedPassword: string
  ): Promise<IOTPSession>;

  /** Active (unused, not expired) session for email+type, regardless of the code value. */
  findActiveSession(email: string, type: OTPSessionType): Promise<IOTPSession | null>;

  findPendingRegistration(email: string): Promise<IOTPSession | null>;

  markUsed(id: string): Promise<void>;

  incrementAttempts(id: string): Promise<IOTPSession | null>;
}
