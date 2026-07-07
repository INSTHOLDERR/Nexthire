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
  USER      = 'user',      // completed onboarding but didn't choose open_to_work/hiring
  JOBSEEKER = 'jobseeker', // open to work
  STUDENT   = 'student',   // studying
  RECRUITER = 'recruiter', // currently hiring
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

export enum WorkStatus {
  NONE             = 'none',              // hasn't set a status
  OPEN_TO_WORK     = 'open_to_work',      // actively looking for a job
  CURRENTLY_HIRING = 'currently_hiring',  // recruiter looking to hire
}
