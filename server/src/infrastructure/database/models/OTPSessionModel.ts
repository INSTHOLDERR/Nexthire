import mongoose, { Schema } from 'mongoose';
import { OTPSessionType } from '../../../domain/entities/enums';

const otpSessionSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    type: { type: String, enum: Object.values(OTPSessionType), required: true },
    expiresAt: { type: Date, required: true },
    registrationExpiresAt: { type: Date, default: null },
    used: { type: Boolean, default: false },
    attemptCount: { type: Number, default: 0 },
    pendingPassword: { type: String, default: null },
  },
  { timestamps: true }
);


otpSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { type: { $ne: 'email_verify' } } }
);
otpSessionSchema.index(
  { registrationExpiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { type: 'email_verify' } }
);

export const OTPSessionModel = mongoose.model('OTPSession', otpSessionSchema);
