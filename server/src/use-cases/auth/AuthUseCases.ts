import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { IOTPRepository } from '../../domain/repositories/otp.repository';
import { IGoogleAuthService } from '../../domain/services/google-auth.service';
import { IEmailService } from '../../domain/services/email.service';
import { ITokenService } from '../../domain/services/token.service';

// ─── AppError helper ──────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly code?: string,
    public readonly user?: unknown
  ) {
    super(message);
  }
}

// ─── RegisterUseCase ──────────────────────────────────────────────────────────
export class RegisterUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute({ email, password }: { email: string; password: string }) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      if (existing.status === 'banned')    throw new AppError(403, 'Account banned.',    'BANNED',    existing);
      if (existing.status === 'suspended') throw new AppError(403, 'Account suspended.', 'SUSPENDED', existing);
      throw new AppError(409, 'Email already exists.', 'EMAIL_EXISTS');
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    await this.otpRepo.createPendingRegistration(email, otp, password);
    await this.emailService.sendOTP(email, otp, 'email_verify');
    return { email };
  }
}

// ─── VerifyOTPUseCase ─────────────────────────────────────────────────────────
export class VerifyOTPUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute({ email, otp, type }: { email: string; otp: string; type: string }) {
    const record = await this.otpRepo.findValid(email, otp, type as any);
    if (!record) throw new AppError(400, 'Invalid or expired OTP.');

    await this.otpRepo.markUsed(record._id);

    if (type === 'email_verify') {
      let user = await this.userRepo.findByEmail(email);
      if (!user) {
        if (!record.pendingPassword)
          throw new AppError(400, 'Registration data expired. Please register again.');
        user = await this.userRepo.createWithHashedPassword({
          email,
          password:        record.pendingPassword,
          authProvider:    'email',
          isEmailVerified: true,
        });
      } else {
        user = (await this.userRepo.update(user._id, { isEmailVerified: true }))!;
      }
      const token = this.tokenService.generate(user._id);
      return {
        token,
        user: { id: user._id, email: user.email, onboardingComplete: user.onboardingComplete, profilePicture: user.profilePicture, firstName: user.firstName },
      };
    }

    if (type === 'login_verify') {
      const user = await this.userRepo.findByEmail(email);
      if (!user) throw new AppError(404, 'User not found.');
      const token = this.tokenService.generate(user._id);
      return {
        token,
        user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, profilePicture: user.profilePicture, onboardingComplete: user.onboardingComplete, status: user.status },
      };
    }

    return { verified: true, email };
  }
}

// ─── LoginUseCase ─────────────────────────────────────────────────────────────
export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute({ email, password }: { email: string; password: string }) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError(404, 'No account found with this email.', 'EMAIL_NOT_FOUND');

    if (user.authProvider === 'google' && !user.password)
      throw new AppError(400, 'This account was created with Google. Use "Forgot password" to set a password first.', 'GOOGLE_ONLY');

    if (user.status === 'banned')    throw new AppError(403, 'Account banned.',    'BANNED',    user);
    if (user.status === 'suspended') throw new AppError(403, 'Account suspended.', 'SUSPENDED', user);

    if (!user.password) throw new AppError(400, 'No password set. Use "Forgot password" to create one.', 'NO_PASSWORD');

    const match = await user.matchPassword(password);
    if (!match) throw new AppError(401, 'Incorrect password. Please try again.');

    if (!user.isEmailVerified) throw new AppError(403, 'Please verify your email first.', 'UNVERIFIED');

    const otp = crypto.randomInt(100000, 999999).toString();
    await this.otpRepo.create(email, otp, 'login_verify');
    await this.emailService.sendOTP(email, otp, 'login_verify');
    return { email };
  }
}

// ─── GoogleAuthUseCase ────────────────────────────────────────────────────────
export class GoogleAuthUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly googleAuth: IGoogleAuthService
  ) {}

  async execute({ idToken }: { idToken: string }) {
    const { uid, email, name, picture } = await this.googleAuth.verifyIdToken(idToken);
    const nameParts = (name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    let user = await this.userRepo.findByEmail(email);
    if (user) {
      if (user.status === 'banned')    throw new AppError(403, 'Account banned.',    'BANNED',    user);
      if (user.status === 'suspended') throw new AppError(403, 'Account suspended.', 'SUSPENDED', user);
      await this.userRepo.update(user._id, { googleId: uid, profilePicture: user.profilePicture || picture });
      user = (await this.userRepo.findByEmail(email))!;
    } else {
      user = await this.userRepo.create({ email, googleId: uid, firstName, lastName, profilePicture: picture, authProvider: 'google', isEmailVerified: true });
    }

    const token = this.tokenService.generate(user._id);
    return { token, user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, profilePicture: user.profilePicture, onboardingComplete: user.onboardingComplete } };
  }
}

// ─── ForgotPasswordUseCase ────────────────────────────────────────────────────
export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpRepo: IOTPRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute({ email }: { email: string }) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError(404, 'No account found with this email.');
    const otp = crypto.randomInt(100000, 999999).toString();
    await this.otpRepo.create(email, otp, 'forgot_password');
    await this.emailService.sendOTP(email, otp, 'forgot_password');
    return { message: 'OTP sent to your email.' };
  }
}

// ─── ResetPasswordUseCase ─────────────────────────────────────────────────────
export class ResetPasswordUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute({ email, newPassword }: { email: string; newPassword: string }) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError(404, 'User not found.');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user._id, { password: hashed, authProvider: 'email', isEmailVerified: true });
    return { message: 'Password reset successful.' };
  }
}
