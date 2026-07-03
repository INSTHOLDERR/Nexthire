import { IOTPRepository } from '../../domain/repositories/otp.repository';
import { IOTPSession, OTPSessionType, OTP_SESSION_TTL_MS, REGISTRATION_INTENT_TTL_MS } from '../../domain/entities/otp.types';
import { OTPSessionModel } from '../database/models/OTPSessionModel';
import { BaseRepository } from './BaseRepository';

export class MongoOTPRepository extends BaseRepository<IOTPSession> implements IOTPRepository {
  protected mapToEntity(doc: any): IOTPSession {
    return {
      _id: doc._id.toString(),
      email: doc.email,
      otp: doc.otp,
      type: doc.type,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      registrationExpiresAt: doc.registrationExpiresAt,
      used: doc.used,
      attemptCount: doc.attemptCount,
      pendingPassword: doc.pendingPassword,
    };
  }

  private newExpiry(): Date {
    return new Date(Date.now() + OTP_SESSION_TTL_MS);
  }

  private newRegistrationExpiry(): Date {
    return new Date(Date.now() + REGISTRATION_INTENT_TTL_MS);
  }

  /** Reset = wipe any prior session for this email+type, start a fresh code window. */
  async createOrReset(email: string, otp: string, type: OTPSessionType): Promise<IOTPSession> {
    await OTPSessionModel.deleteMany({ email, type });

    const doc = await OTPSessionModel.create({
      email,
      otp,
      type,
      expiresAt: this.newExpiry(),
      attemptCount: 0,
    });

    return this.mapToEntity(doc);
  }

  /**
   * Sets BOTH windows: `expiresAt` (short — just this code) AND
   * `registrationExpiresAt` (long — the registration intent + hashed
   * password). The first call (during register) and every resend call
   * both go through here, so both windows reset together on every resend
   * too — resending doesn't just refresh the code, it also gives the user
   * a fresh REGISTRATION_INTENT_TTL_MS before the whole thing is forgotten.
   */
  async createOrResetPendingRegistration(email: string, otp: string, hashedPassword: string): Promise<IOTPSession> {
    await OTPSessionModel.deleteMany({ email, type: 'email_verify' });

    const doc = await OTPSessionModel.create({
      email,
      otp,
      type: 'email_verify',
      expiresAt: this.newExpiry(),
      registrationExpiresAt: this.newRegistrationExpiry(),
      attemptCount: 0,
      pendingPassword: hashedPassword,
    });

    return this.mapToEntity(doc);
  }

  async findActiveSession(email: string, type: OTPSessionType): Promise<IOTPSession | null> {
    const doc = await OTPSessionModel.findOne({
      email,
      type,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return doc ? this.mapToEntity(doc) : null;
  }

  /**
   * Checks `registrationExpiresAt` (the long window), NOT `expiresAt` (the
   * short code window). This is the actual fix for resend-after-expiry:
   * the OTP code itself can expire and resend must still succeed, because
   * the registration intent — and the hashed password it's protecting —
   * is governed by its own, separate, longer-lived expiry.
   */
  async findPendingRegistration(email: string): Promise<IOTPSession | null> {
    const doc = await OTPSessionModel.findOne({
      email,
      type: 'email_verify',
      used: false,
      pendingPassword: { $ne: null },
      registrationExpiresAt: { $gt: new Date() },
    });

    return doc ? this.mapToEntity(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await OTPSessionModel.findByIdAndUpdate(id, { used: true });
  }

  async incrementAttempts(id: string): Promise<IOTPSession | null> {
    const doc = await OTPSessionModel.findByIdAndUpdate(id, { $inc: { attemptCount: 1 } }, { new: true });
    return doc ? this.mapToEntity(doc) : null;
  }
}

export default new MongoOTPRepository();
