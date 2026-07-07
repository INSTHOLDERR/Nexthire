/**
 * Single source of truth for every machine-readable error code the API can
 * return. The frontend's ApiResponse.code field switches on these — never
 * on the free-text `message`, which can change wording without breaking
 * frontend logic.
 */
export enum ErrorCode {
  // Auth — registration / login
  EMAIL_EXISTS         = 'EMAIL_EXISTS',
  EMAIL_NOT_FOUND       = 'EMAIL_NOT_FOUND',
  INVALID_CREDENTIALS   = 'INVALID_CREDENTIALS',
  GOOGLE_ONLY_ACCOUNT   = 'GOOGLE_ONLY_ACCOUNT',
  NO_PASSWORD_SET       = 'NO_PASSWORD_SET',
  EMAIL_NOT_VERIFIED    = 'EMAIL_NOT_VERIFIED',
  USER_NOT_FOUND        = 'USER_NOT_FOUND',

  // OTP session
  OTP_INVALID           = 'OTP_INVALID',
  OTP_EXPIRED           = 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS      = 'OTP_MAX_ATTEMPTS',
  REGISTRATION_EXPIRED  = 'REGISTRATION_EXPIRED',

  // Account status
  ACCOUNT_BANNED        = 'BANNED',
  ACCOUNT_SUSPENDED     = 'SUSPENDED',

  // Appeals
  APPEAL_ALREADY_PENDING = 'APPEAL_ALREADY_PENDING',
  APPEAL_NOT_FOUND        = 'APPEAL_NOT_FOUND',
  APPEAL_INVALID_STATUS   = 'APPEAL_INVALID_STATUS',
  APPEAL_NOT_ALLOWED      = 'APPEAL_NOT_ALLOWED',

  // Admin
  ADMIN_INVALID_CREDENTIALS = 'ADMIN_INVALID_CREDENTIALS',
  ADMIN_UNAUTHORIZED        = 'ADMIN_UNAUTHORIZED',
  ADMIN_INVALID_ACTION      = 'ADMIN_INVALID_ACTION',

  // Generic / cross-cutting
  VALIDATION_ERROR      = 'VALIDATION_ERROR',
  UNAUTHORIZED          = 'UNAUTHORIZED',
  TOKEN_INVALID         = 'TOKEN_INVALID',
  NOT_FOUND             = 'NOT_FOUND',
  INTERNAL_ERROR        = 'INTERNAL_ERROR',
  ROLE_REQUIRED         = 'ROLE_REQUIRED',   // tried to access a role-gated feature
}
