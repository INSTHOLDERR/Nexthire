// ─── Auth / User ──────────────────────────────────────────────────────────────
export type AuthProvider = 'email' | 'google';
export type UserRole     = 'jobseeker' | 'student';
export enum UserStatus {
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  BANNED    = 'banned',
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  onboardingComplete: boolean;
  status?: UserStatus;
}

export type AuthMethod = 'email' | 'google' | null;

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  pendingEmail: string | null;
  authMethod: AuthMethod;
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
export type OTPType = 'email_verify' | 'login_verify' | 'forgot_password';

// ─── Appeal ───────────────────────────────────────────────────────────────────
export type AppealStatus = 'pending' | 'approved' | 'rejected';
export type AppealType   = 'suspension' | 'ban';

export interface Appeal {
  _id: string;
  type: AppealType;
  explanation: string;
  evidence: string[];
  status: AppealStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  status: UserStatus;
  role?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
  banReason?: string;
  bannedAt?: string;
  createdAt: string;
}

export interface AdminAppeal {
  _id: string;
  userId: AdminUser;
  type: AppealType;
  explanation: string;
  evidence: string[];
  status: AppealStatus;
  createdAt: string;
}

export type AdminAction = 'ban' | 'suspend' | 'activate';

// ─── Socket events ────────────────────────────────────────────────────────────
export interface AccountStatusChangedEvent {
  code: 'BANNED' | 'SUSPENDED' | 'ACTIVE';
  data?: {
    banReason?: string;
    bannedAt?: string;
    userId?: string;
    suspensionReason?: string;
    suspendedAt?: string;
    suspendedUntil?: string;
  };
}

export interface AppealReviewedEvent {
  appealId: string;
  status: AppealStatus;
  adminMsg: string;
  appealType: AppealType;
}

// ─── API response wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
}

// ─── Suspension page state ────────────────────────────────────────────────────
export interface SuspendedState {
  userId?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedUntil?: string;
}

export interface BannedState {
  userId?: string;
  banReason?: string;
  bannedAt?: string;
}
