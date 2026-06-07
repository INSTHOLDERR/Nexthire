import bcrypt from 'bcryptjs';
import { IOTPRepository } from '../../domain/repositories/otp.repository';
import { IOTP } from '../../domain/entities/otp.types';
import OTPModel from '../database/models/OTPModel';

export class MongoOTPRepository implements IOTPRepository {
  private mapToEntity(otp: any): IOTP {
    return {
      _id: otp._id.toString(),
      email: otp.email,
      otp: otp.otp,
      type: otp.type,
      expiresAt: otp.expiresAt,
      used: otp.used,
      pendingPassword: otp.pendingPassword,
    };
  }

  async create(
    email: string,
    otp: string,
    type: IOTP['type']
  ): Promise<IOTP> {
    await OTPModel.deleteMany({ email, type });

    const otpDoc = await OTPModel.create({
      email,
      otp,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return this.mapToEntity(otpDoc);
  }

  async createPendingRegistration(
    email: string,
    otp: string,
    plaintextPassword: string
  ): Promise<IOTP> {
    await OTPModel.deleteMany({
      email,
      type: 'email_verify',
    });

    const pendingPassword = await bcrypt.hash(
      plaintextPassword,
      12
    );

    const otpDoc = await OTPModel.create({
      email,
      otp,
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      pendingPassword,
    });

    return this.mapToEntity(otpDoc);
  }

  async findValid(
    email: string,
    otp: string,
    type: IOTP['type']
  ): Promise<IOTP | null> {
    const otpDoc = await OTPModel.findOne({
      email,
      otp,
      type,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    return otpDoc ? this.mapToEntity(otpDoc) : null;
  }

  async findPendingRegistration(
    email: string
  ): Promise<IOTP | null> {
    const otpDoc = await OTPModel.findOne({
      email,
      type: 'email_verify',
      used: false,
      pendingPassword: { $ne: null },
      expiresAt: { $gt: new Date() },
    });

    return otpDoc ? this.mapToEntity(otpDoc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await OTPModel.findByIdAndUpdate(id, {
      used: true,
    });
  }
}

export default new MongoOTPRepository();