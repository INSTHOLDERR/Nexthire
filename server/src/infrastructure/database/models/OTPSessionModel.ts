import mongoose, { Schema } from 'mongoose';

const otpSessionSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ['email_verify', 'forgot_password', 'login_verify'], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attemptCount: { type: Number, default: 0 },
    pendingPassword: { type: String, default: null },
  },
  { timestamps: true }
);


otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTPSessionModel = mongoose.model('OTPSession', otpSessionSchema);
