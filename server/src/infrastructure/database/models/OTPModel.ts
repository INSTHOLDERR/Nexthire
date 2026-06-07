import mongoose, { Schema } from 'mongoose';

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'email_verify',
        'forgot_password',
        'login_verify',
      ],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    pendingPassword: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model('OTP', otpSchema);