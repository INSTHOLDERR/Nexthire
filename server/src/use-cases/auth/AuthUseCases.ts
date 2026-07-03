import * as bcrypt from 'bcryptjs';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { IOTPRepository } from '../../domain/repositories/otp.repository';
import { IGoogleAuthService } from '../../domain/services/google-auth.service';
import { IEmailService } from '../../domain/services/email.service';
import { ITokenService } from '../../domain/services/token.service';
import { OTPGenerator } from '../../infrastructure/services/OTPGenerator';
import { OTP_MAX_ATTEMPTS } from '../../domain/entities/otp.types';
import { AppError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/error-codes';
import { UseCase } from '../UseCase';
import { UserStatus, OTPSessionType, AuthProvider } from '../../domain/entities/enums';

// ─── RegisterUseCase ────────────────────────────────────────────────────────

interface RegisterInput { email: string; password: string }
interface RegisterOutput { email: string }

export class RegisterUseCase extends UseCase<RegisterInput, RegisterOutput> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService,
    private readonly otpGenerator: OTPGenerator = new OTPGenerator()
  ) {
    super();
  }

  async execute({ email, password }: RegisterInput): Promise<RegisterOutput> {
    const existing = await this.userRepo.findByEmail(email);

    if (existing) {
      if (existing.status === UserStatus.BANNED) {
        throw AppError.bannedAccount(existing);
      }
      if (existing.status === UserStatus.SUSPENDED) {
        throw AppError.suspendedAccount(existing);
      }
      throw AppError.conflict('An account with this email already exists.', ErrorCode.EMAIL_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = this.otpGenerator.generate();

    // Fresh OTP session — wipes any earlier pending registration for this email.
    // Sets both the short code window and the longer registration-intent window.
    await this.otpRepo.createOrResetPendingRegistration(email, otp, hashedPassword);
    await this.emailService.sendOTP(email, otp, OTPSessionType.EMAIL_VERIFY);

    return { email };
  }
}

// ─── VerifyOTPUseCase ───────────────────────────────────────────────────────

interface VerifyOTPInput { email: string; otp: string; type: string }

type VerifyOTPOutput =
  | { token: string; user: { id: string; email: string; onboardingComplete: boolean; profilePicture?: string; firstName?: string } }
  | { token: string; user: { id: string; email: string; firstName?: string; lastName?: string; profilePicture?: string; onboardingComplete: boolean; status: string } }
  | { verified: true; email: string };

export class VerifyOTPUseCase extends UseCase<VerifyOTPInput, VerifyOTPOutput> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly tokenService: ITokenService
  ) {
    super();
  }

  async execute({ email, otp, type }: VerifyOTPInput): Promise<VerifyOTPOutput> {
    const session = await this.otpRepo.findActiveSession(email, type as any);

    if (!session) {
      throw AppError.badRequest('Your code has expired. Please request a new one.', ErrorCode.OTP_EXPIRED);
    }

    if (session.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw AppError.tooManyRequests(
        'Too many incorrect attempts. Please request a new code.',
        ErrorCode.OTP_MAX_ATTEMPTS
      );
    }

    if (session.otp !== otp) {
      await this.otpRepo.incrementAttempts(session._id);
      throw AppError.badRequest('Incorrect code. Please try again.', ErrorCode.OTP_INVALID);
    }

    await this.otpRepo.markUsed(session._id);

    if (type === OTPSessionType.EMAIL_VERIFY) {
      let user = await this.userRepo.findByEmail(email);

      if (!user) {
        if (!session.pendingPassword) {
          throw AppError.badRequest(
            'Registration data expired. Please register again.',
            ErrorCode.REGISTRATION_EXPIRED
          );
        }
        user = await this.userRepo.createWithHashedPassword({
          email,
          password: session.pendingPassword,
          authProvider: AuthProvider.EMAIL,
          isEmailVerified: true,
        });
      } else {
        user = (await this.userRepo.update(user._id, { isEmailVerified: true }))!;
      }

      const token = this.tokenService.generate(user._id);
      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          onboardingComplete: user.onboardingComplete,
          profilePicture: user.profilePicture,
          firstName: user.firstName,
        },
      };
    }

    if (type === OTPSessionType.LOGIN_VERIFY) {
      const user = await this.userRepo.findByEmail(email);
      if (!user) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

      const token = this.tokenService.generate(user._id);
      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          onboardingComplete: user.onboardingComplete,
          status: user.status,
        },
      };
    }

    // forgot_password — confirms the code; ResetPasswordUseCase does the actual reset.
    return { verified: true, email };
  }
}

// ─── LoginUseCase ───────────────────────────────────────────────────────────
// Every call to login() that passes the password check issues a fresh OTP
// session — this is also how the frontend's "resend" button works, since it
// just calls /auth/login again.

interface LoginInput { email: string; password: string }
interface LoginOutput { email: string }

export class LoginUseCase extends UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService,
    private readonly otpGenerator: OTPGenerator = new OTPGenerator()
  ) {
    super();
  }

  async execute({ email, password }: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw AppError.notFound('No account found with this email.', ErrorCode.EMAIL_NOT_FOUND);
    }

    if (user.authProvider === AuthProvider.GOOGLE && !user.password) {
      throw AppError.badRequest(
        'This account was created with Google. Use "Forgot password" to set a password first.',
        ErrorCode.GOOGLE_ONLY_ACCOUNT
      );
    }

    if (user.status === UserStatus.BANNED) {
      throw AppError.bannedAccount(user);
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw AppError.suspendedAccount(user);
    }

    if (!user.password) {
      throw AppError.badRequest(
        'No password set. Use "Forgot password" to create one.',
        ErrorCode.NO_PASSWORD_SET
      );
    }

    const match = await user.matchPassword(password);
    if (!match) {
      throw AppError.unauthorized('Incorrect password. Please try again.', ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.isEmailVerified) {
      throw AppError.forbidden('Please verify your email first.', ErrorCode.EMAIL_NOT_VERIFIED);
    }

    const otp = this.otpGenerator.generate();
    await this.otpRepo.createOrReset(email, otp, OTPSessionType.LOGIN_VERIFY);
    await this.emailService.sendOTP(email, otp, OTPSessionType.LOGIN_VERIFY);

    return { email };
  }
}

// ─── GoogleAuthUseCase ──────────────────────────────────────────────────────

interface GoogleAuthInput { idToken: string }
interface GoogleAuthOutput {
  token: string;
  user: { id: string; email: string; firstName?: string; lastName?: string; profilePicture?: string; onboardingComplete: boolean };
}

export class GoogleAuthUseCase extends UseCase<GoogleAuthInput, GoogleAuthOutput> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly googleAuth: IGoogleAuthService
  ) {
    super();
  }

  async execute({ idToken }: GoogleAuthInput): Promise<GoogleAuthOutput> {
    const { uid, email, name, picture } = await this.googleAuth.verifyIdToken(idToken);
    const nameParts = (name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    let user = await this.userRepo.findByEmail(email);

    if (user) {
      if (user.status === UserStatus.BANNED) {
        throw AppError.bannedAccount(user);
      }
      if (user.status === UserStatus.SUSPENDED) {
        throw AppError.suspendedAccount(user);
      }
      await this.userRepo.update(user._id, { googleId: uid, profilePicture: user.profilePicture || picture });
      user = (await this.userRepo.findByEmail(email))!;
    } else {
      user = await this.userRepo.create({
        email,
        googleId: uid,
        firstName,
        lastName,
        profilePicture: picture,
        authProvider: AuthProvider.GOOGLE,
        isEmailVerified: true,
      });
    }

    const token = this.tokenService.generate(user._id);
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        onboardingComplete: user.onboardingComplete,
      },
    };
  }
}

// ─── ForgotPasswordUseCase ──────────────────────────────────────────────────

interface ForgotPasswordInput { email: string }
interface ForgotPasswordOutput { message: string }

export class ForgotPasswordUseCase extends UseCase<ForgotPasswordInput, ForgotPasswordOutput> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService,
    private readonly otpGenerator: OTPGenerator = new OTPGenerator()
  ) {
    super();
  }

  async execute({ email }: ForgotPasswordInput): Promise<ForgotPasswordOutput> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw AppError.notFound('No account found with this email.', ErrorCode.EMAIL_NOT_FOUND);
    }

    const otp = this.otpGenerator.generate();
    await this.otpRepo.createOrReset(email, otp, OTPSessionType.FORGOT_PASSWORD);
    await this.emailService.sendOTP(email, otp, OTPSessionType.FORGOT_PASSWORD);

    return { message: 'OTP sent to your email.' };
  }
}

// ─── ResetPasswordUseCase ───────────────────────────────────────────────────

interface ResetPasswordInput { email: string; newPassword: string }
interface ResetPasswordOutput { message: string }

export class ResetPasswordUseCase extends UseCase<ResetPasswordInput, ResetPasswordOutput> {
  constructor(private readonly userRepo: IUserRepository) {
    super();
  }

  async execute({ email, newPassword }: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user._id, {
      password: hashed,
      authProvider: AuthProvider.EMAIL,
      isEmailVerified: true,
    });

    return { message: 'Password reset successful.' };
  }
}

// ─── ResendOTPUseCase ───────────────────────────────────────────────────────
// Handles `email_verify` resends specifically. login_verify and
// forgot_password resends are already covered by re-calling LoginUseCase /
// ForgotPasswordUseCase (both call createOrReset, which is exactly a resend).
// email_verify can't safely reuse RegisterUseCase for a resend: the user
// record may not exist yet, the frontend no longer has the original
// plaintext password at the verify step, and re-running full registration
// validation (e.g. the EMAIL_EXISTS check) is the wrong semantic for
// "I already registered, just resend the code."

interface ResendOTPInput { email: string }
interface ResendOTPOutput { email: string }

export class ResendOTPUseCase extends UseCase<ResendOTPInput, ResendOTPOutput> {
  constructor(
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService,
    private readonly otpGenerator: OTPGenerator = new OTPGenerator()
  ) {
    super();
  }

  async execute({ email }: ResendOTPInput): Promise<ResendOTPOutput> {
    const pending = await this.otpRepo.findPendingRegistration(email);

    if (!pending || !pending.pendingPassword) {
      throw AppError.badRequest(
        'Your registration session has expired. Please register again.',
        ErrorCode.REGISTRATION_EXPIRED
      );
    }

    const otp = this.otpGenerator.generate();
    // Reuses the same hashed password already stored on the pending session —
    // resend never needs the plaintext password again.
    await this.otpRepo.createOrResetPendingRegistration(email, otp, pending.pendingPassword);
    await this.emailService.sendOTP(email, otp, OTPSessionType.EMAIL_VERIFY);

    return { email };
  }
}
