import { IOTPRepository } from '../../domain/repositories/otp.repository';
import { IOTPSession, OTPSessionType, OTP_SESSION_TTL_MS } from '../../domain/entities/otp.types';
import { OTPSessionModel } from '../database/models/OTPSessionModel';

export class MongoOTPRepository implements IOTPRepository {
  private mapToEntity(doc: any): IOTPSession {
    return {
      _id: doc._id.toString(),
      email: doc.email,
      otp: doc.otp,
      type: doc.type,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      used: doc.used,
      attemptCount: doc.attemptCount,
      pendingPassword: doc.pendingPassword,
    };
  }

  private newExpiry(): Date {
    return new Date(Date.now() + OTP_SESSION_TTL_MS);
  }


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

  async createOrResetPendingRegistration(email: string, otp: string, hashedPassword: string): Promise<IOTPSession> {
    await OTPSessionModel.deleteMany({ email, type: 'email_verify' });

    const doc = await OTPSessionModel.create({
      email,
      otp,
      type: 'email_verify',
      expiresAt: this.newExpiry(),
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

  async findPendingRegistration(email: string): Promise<IOTPSession | null> {
    const doc = await OTPSessionModel.findOne({
      email,
      type: 'email_verify',
      used: false,
      pendingPassword: { $ne: null },
      expiresAt: { $gt: new Date() },
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
