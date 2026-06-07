import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: String,
    googleId: String,
    authProvider: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: String,
    location: String,
    profilePicture: String,

    role: {
      type: String,
      enum: ['jobseeker', 'student'],
    },

    jobTitle: String,
    company: String,

    school: String,
    degree: String,
    fieldOfStudy: String,
    startYear: String,

    openToWork: {
      type: Boolean,
      default: false,
    },
    isHiring: {
      type: Boolean,
      default: false,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },

    suspensionReason: {
      type: String,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },

    banReason: {
      type: String,
      default: null,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if ((this as any).$locals?.skipPasswordHash) return next();

  if (!this.isModified('password') || !this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (
  entered: string
) {
  return bcrypt.compare(entered, this.password ?? '');
};

export const UserModel = mongoose.model(
  'User',
  userSchema
);