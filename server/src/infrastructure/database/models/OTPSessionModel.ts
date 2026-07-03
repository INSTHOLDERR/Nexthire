import mongoose, { Schema } from 'mongoose';
import { OTPSessionType } from '../../../domain/entities/enums';

const otpSessionSchema = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    type: { type: String, enum: Object.values(OTPSessionType), required: true },
    expiresAt: { type: Date, required: true },
    // Independent, longer-lived expiry for the registration itself (and the
    // pendingPassword it holds) — only set for email_verify sessions. Lets
    // resend work even after the short-lived OTP code has expired.
    registrationExpiresAt: { type: Date, default: null },
    used: { type: Boolean, default: false },
    attemptCount: { type: Number, default: 0 },
    pendingPassword: { type: String, default: null },
  },
  { timestamps: true }
);

// Two TTL indexes that NEVER compete over the same document:
//
// - `expiresAt` index is PARTIAL — it only applies to documents where
//   `type` is NOT 'email_verify' (i.e. forgot_password / login_verify).
//   Those sessions have no long-lived password to protect, so deleting
//   the whole document the moment the short code window passes is fine.
//
// - `registrationExpiresAt` index governs ALL email_verify documents.
//   This is what protects `pendingPassword` from being deleted just
//   because the current 6-digit code expired — the document (and the
//   hashed password inside it) survives until REGISTRATION_INTENT_TTL_MS
//   has passed, regardless of how many OTP codes were issued/resent
//   against it in the meantime.
//
// Without the partialFilterExpression here, both indexes would apply to
// every document, and whichever TTL fires first deletes the WHOLE
// document — there's no way to "protect" individual fields from a TTL
// delete. Splitting by `type` is what keeps the two windows from
// stepping on each other.
otpSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { type: { $ne: 'email_verify' } } }
);
otpSessionSchema.index(
  { registrationExpiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { type: 'email_verify' } }
);

export const OTPSessionModel = mongoose.model('OTPSession', otpSessionSchema);
