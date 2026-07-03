/**
 * Centralized enums for the entire application.
 * Every status, type, role, or provider value lives here as an enum
 * instead of scattered string literals — so a typo like 'baned' fails
 * at compile time instead of silently passing a wrong value at runtime.
 */

export enum UserStatus {
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  BANNED    = 'banned',
}

export enum AuthProvider {
  EMAIL  = 'email',
  GOOGLE = 'google',
}

export enum UserRole {
  JOBSEEKER = 'jobseeker',
  STUDENT   = 'student',
}

export enum AppealStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AppealType {
  SUSPENSION = 'suspension',
  BAN        = 'ban',
}

export enum OTPSessionType {
  EMAIL_VERIFY    = 'email_verify',
  FORGOT_PASSWORD = 'forgot_password',
  LOGIN_VERIFY    = 'login_verify',
}
