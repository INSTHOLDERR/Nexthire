import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserStatus, AuthProvider, UserRole } from '../../../domain/entities/enums';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: String,
    googleId: String,
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.EMAIL,
    },
    isEmailVerified: { type: Boolean, default: false },

    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    profilePicture: String,

    role: {
      type: String,
      enum: Object.values(UserRole),
    },

    onboardingComplete: { type: Boolean, default: false },

    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },

    suspensionReason: { type: String, default: null },
    suspendedAt: { type: Date, default: null },
    suspendedUntil: { type: Date, default: null },

    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered: string) {
  return bcrypt.compare(entered, this.password ?? '');
};

export const UserModel = mongoose.model('User', userSchema);
