import { UserStatus, AuthProvider, UserRole, WorkStatus } from './enums';

// ── Sub-document types ────────────────────────────────────────────────────────

export interface ISkill {
  _id: string;
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface IProject {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  liveLink?: string;
  githubLink?: string;
  otherLinks?: { label: string; url: string }[];
  skills?: string[];
}

export interface IExperience {
  _id: string;
  jobTitle: string;
  company: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'volunteer';
  startDate: string;   // ISO date string
  endDate?: string;
  isCurrent: boolean;
  location?: string;
  description?: string;
  skills?: string[];
}

export interface IEducation {
  _id: string;
  school: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  grade?: string;
  activities?: string;
  description?: string;
}

export interface ILanguage {
  _id: string;
  name: string;
  proficiency: 'basic' | 'conversational' | 'professional' | 'native';
}

export interface IContact {
  _id: string;
  type: 'whatsapp' | 'linkedin' | 'github' | 'portfolio' | 'twitter' | 'instagram' | 'other';
  value: string;       // phone number (with country code) or URL
  label?: string;      // for 'other' type
}

// ── Main User type ────────────────────────────────────────────────────────────

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
  profilePicturePublicId?: string;
  coverPicture?: string;
  coverPicturePublicId?: string;
  headline?: string;
  about?: string;
  location?: string;
  phone?: string;
  resumeUrl?: string;
  resumePublicId?: string;

  // Professional context
  company?: string;
  jobTitle?: string;
  school?: string;
  degree?: string;
  fieldOfStudy?: string;
  startYear?: string;

  // Profile sections
  skills:      ISkill[];
  projects:    IProject[];
  experiences: IExperience[];
  educations:  IEducation[];
  languages:   ILanguage[];
  contacts:    IContact[];

  // Profile stats
  profileViews: number;
  profileViewers: string[];   // recent viewer userIds

  role?: UserRole;
  workStatus: WorkStatus;

  // Social graph
  connections:        string[];
  pendingConnections: string[];
  connectionRequests: string[];

  // Account state
  onboardingComplete: boolean;
  status: UserStatus;

  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;

  banReason?: string;
  bannedAt?: Date;

  // Deactivation
  isDeactivated?: boolean;
  deactivatedAt?: Date;

  blockedUsers?: string[];

  createdAt: Date;
  updatedAt: Date;

  matchPassword(password: string): Promise<boolean>;
}
