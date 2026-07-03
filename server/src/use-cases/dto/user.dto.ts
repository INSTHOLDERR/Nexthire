import { IUser } from '../../domain/entities/user.types';
import { UserStatus } from '../../domain/entities/enums';

/**
 * UserResponseDTO — what the API sends back whenever a user object is
 * part of a response (after login, after verify-OTP, after profile setup).
 *
 * Why this class exists instead of inline `{ id: user._id, email: ... }`:
 * - One place to change if the response shape needs to change
 * - Guarantees every endpoint returns the same field names and types
 * - Makes it impossible to accidentally leak sensitive fields (password
 *   hash, googleId, internal Mongo _id format) — only what's listed here
 *   is ever sent to the client
 * - Self-documenting: a frontend developer can read this one class to
 *   know exactly what they'll receive from any auth endpoint
 */
export class UserResponseDTO {
  readonly id: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly profilePicture?: string;
  readonly onboardingComplete: boolean;
  readonly status: UserStatus;

  constructor(user: IUser) {
    this.id               = user._id;
    this.email            = user.email;
    this.firstName        = user.firstName;
    this.lastName         = user.lastName;
    this.profilePicture   = user.profilePicture;
    this.onboardingComplete = user.onboardingComplete;
    this.status           = user.status;
  }
}

/**
 * AuthResponseDTO — wraps the JWT token + user data returned after
 * successful authentication (email_verify or login_verify OTP success).
 */
export class AuthResponseDTO {
  readonly token: string;
  readonly user: UserResponseDTO;

  constructor(token: string, user: IUser) {
    this.token = token;
    this.user  = new UserResponseDTO(user);
  }
}

/**
 * PendingAuthDTO — returned when registration or login succeeds but the
 * user still needs to verify their OTP before receiving a JWT.
 * Only contains the email, to tell the frontend where the OTP was sent.
 */
export class PendingAuthDTO {
  readonly email: string;

  constructor(email: string) {
    this.email = email;
  }
}

/**
 * MessageDTO — for simple success responses that only need a message
 * (password reset, OTP sent, etc.)
 */
export class MessageDTO {
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}

/**
 * OTPVerifiedDTO — returned by verify-OTP for the forgot_password flow,
 * where verifying the code doesn't immediately produce a token —
 * it just confirms the code was correct so the next step (reset password)
 * is unlocked.
 */
export class OTPVerifiedDTO {
  readonly verified: true = true;
  readonly email: string;

  constructor(email: string) {
    this.email = email;
  }
}
