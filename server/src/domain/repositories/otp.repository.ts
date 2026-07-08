import { IOTPSession, OTPSessionType } from '../entities/otp.types';
export interface IOTPRepository {
  createOrReset(email: string, otp: string, type: OTPSessionType): Promise<IOTPSession>;

  createOrResetPendingRegistration(
    email: string,
    otp: string,
    hashedPassword: string
  ): Promise<IOTPSession>;

  findActiveSession(email: string, type: OTPSessionType): Promise<IOTPSession | null>;

  findPendingRegistration(email: string): Promise<IOTPSession | null>;

  markUsed(id: string): Promise<void>;

  incrementAttempts(id: string): Promise<IOTPSession | null>;
}
