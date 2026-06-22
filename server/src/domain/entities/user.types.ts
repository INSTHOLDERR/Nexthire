export interface IUser {
  _id: string;
  email: string;
  password?: string;
  googleId?: string;
  authProvider: 'email' | 'google';
  isEmailVerified: boolean;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  role?: 'jobseeker' | 'student';
  onboardingComplete: boolean;
  status: 'active' | 'suspended' | 'banned';
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;
  banReason?: string;
  bannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  matchPassword(password: string): Promise<boolean>;
}
