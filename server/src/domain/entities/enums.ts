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
  USER      = 'user',      
  JOBSEEKER = 'jobseeker', 
  STUDENT   = 'student',  
  RECRUITER = 'recruiter', 
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
  NONE             = 'none',             
  OPEN_TO_WORK     = 'open_to_work',      
  CURRENTLY_HIRING = 'currently_hiring', 
}
