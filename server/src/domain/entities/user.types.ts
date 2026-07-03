import { UserStatus, AuthProvider, UserRole } from './enums';

export interface IUser {
  _id: string;
  email: string;
  password?: string;
  googleId?: string;

  authProvider: AuthProvider;
  isEmailVerified: boolean;

  firstName?: string;
  lastName?: string;
  profilePicture?: string;

  role?: UserRole;

  onboardingComplete: boolean;

  status: UserStatus;

  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;

  banReason?: string;
  bannedAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  matchPassword(password: string): Promise<boolean>;
}
