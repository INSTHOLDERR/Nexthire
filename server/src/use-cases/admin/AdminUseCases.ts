import { IUserRepository, PaginatedUsers, UserFilter } from '../../domain/repositories/user.repository';
import { IAppealRepository, PaginatedAppeals } from '../../domain/repositories/appeal.repository';
import { IUser } from '../../domain/entities/user.types';
import { IAppeal } from '../../domain/entities/appeal.types';
import { IEmailService } from '../../domain/services/email.service';
import { AppError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/error-codes';
import { Server } from 'socket.io';
import { UseCase } from '../UseCase';
import { UserStatus, AppealStatus, UserRole, AppealType } from '../../domain/entities/enums';
import cacheService from '../../infrastructure/services/CacheService';

// Cache key helpers — centralised here so invalidation patterns always match
const usersCacheKey   = (f: UserFilter)   => `admin:users:${JSON.stringify(f)}`;
const appealsCacheKey = (f: { status?: AppealStatus; type?: AppealType; page: number; limit: number }) =>
  `admin:appeals:${JSON.stringify(f)}`;

// ─── GetUsersUseCase ────────────────────────────────────────────────────────

interface GetUsersInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  role?: UserRole;
}

export class GetUsersUseCase extends UseCase<GetUsersInput, PaginatedUsers> {
  constructor(private readonly userRepo: IUserRepository) {
    super();
  }

  async execute({ page = 1, limit = 10, search = '', status, role }: GetUsersInput): Promise<PaginatedUsers> {
    const filter: UserFilter = { search, status, role, page, limit };
    const key = usersCacheKey(filter);

    const cached = await cacheService.get<PaginatedUsers>(key);
    if (cached) return cached;

    const result = await this.userRepo.findAll(filter);
    await cacheService.set(key, result);
    return result;
  }
}

// ─── SetUserStatusUseCase ───────────────────────────────────────────────────

interface SetUserStatusInput {
  userId: string;
  action: 'ban' | 'suspend' | 'activate';
  reason?: string;
  suspendDays?: number | string;
  io?: Server;
}

export class SetUserStatusUseCase extends UseCase<SetUserStatusInput, IUser> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService
  ) {
    super();
  }

  async execute({ userId, action, reason, suspendDays, io }: SetUserStatusInput): Promise<IUser> {
    let update: Record<string, unknown> = {};

    if (action === 'ban') {
      update = { status: UserStatus.BANNED, banReason: reason || 'Violated terms of service', bannedAt: new Date() };
    } else if (action === 'suspend') {
      const until = new Date();
      until.setDate(until.getDate() + (parseInt(String(suspendDays)) || 7));
      update = {
        status: UserStatus.SUSPENDED,
        suspensionReason: reason || 'Temporary suspension',
        suspendedAt: new Date(),
        suspendedUntil: until,
      };
    } else if (action === 'activate') {
      update = {
        status: UserStatus.ACTIVE,
        suspensionReason: null,
        suspendedAt: null,
        suspendedUntil: null,
        banReason: null,
        bannedAt: null,
      };
    } else {
      throw AppError.badRequest('Invalid action.', ErrorCode.ADMIN_INVALID_ACTION);
    }

    const user = await this.userRepo.update(userId, update as any);
    if (!user) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    if (io) {
      if (action === 'ban') {
        io.to(`user:${userId}`).emit('account_status_changed', {
          code: ErrorCode.ACCOUNT_BANNED,
          data: { banReason: update.banReason, bannedAt: update.bannedAt },
        });
      } else if (action === 'suspend') {
        io.to(`user:${userId}`).emit('account_status_changed', {
          code: ErrorCode.ACCOUNT_SUSPENDED,
          data: {
            userId: String(user._id),
            suspensionReason: update.suspensionReason,
            suspendedAt: update.suspendedAt,
            suspendedUntil: update.suspendedUntil,
          },
        });
      } else {
        io.to(`user:${userId}`).emit('account_status_changed', { code: 'ACTIVE' });
      }
      io.to('admin').emit('user_status_changed', { userId: String(user._id), status: user.status });
    }

    try {
      if (action === 'suspend') {
        await this.emailService.sendSuspension(user.email, {
          reason: update.suspensionReason as string,
          suspendedAt: update.suspendedAt as Date,
          suspendedUntil: update.suspendedUntil as Date,
        });
      } else if (action === 'ban') {
        await this.emailService.sendBan(user.email, {
          reason: update.banReason as string,
          bannedAt: update.bannedAt as Date,
        });
      }
    } catch (emailErr) {
      console.warn(`⚠️ Email failed for ${user.email}:`, (emailErr as Error).message);
    }

    // Invalidate all cached user query results — status change means any
    // page/filter combination that included this user is now stale.
    await cacheService.invalidatePattern('admin:users:*');

    return user;
  }
}

// ─── GetAppealsUseCase ──────────────────────────────────────────────────────

interface GetAppealsInput {
  status?: AppealStatus;
  type?: AppealType;
  page?: number;
  limit?: number;
}

export class GetAppealsUseCase extends UseCase<GetAppealsInput, PaginatedAppeals> {
  constructor(private readonly appealRepo: IAppealRepository) {
    super();
  }
  async execute({ status, type, page = 1, limit = 10 }: GetAppealsInput): Promise<PaginatedAppeals> {
    const filter = { status, type, page, limit };
    const key = appealsCacheKey(filter);

    const cached = await cacheService.get<PaginatedAppeals>(key);
    if (cached) return cached;

    const result = await this.appealRepo.findAll(filter);
    await cacheService.set(key, result);
    return result;
  }
}

// ─── ReviewAppealUseCase ────────────────────────────────────────────────────

interface ReviewAppealInput {
  appealId: string;
  status: AppealStatus.APPROVED | AppealStatus.REJECTED;
  adminMsg: string;
  io?: Server;
}

export class ReviewAppealUseCase extends UseCase<ReviewAppealInput, IAppeal> {
  constructor(
    private readonly appealRepo: IAppealRepository,
    private readonly setUserStatusUseCase: SetUserStatusUseCase,
    private readonly emailService: IEmailService
  ) {
    super();
  }

  async execute({ appealId, status, adminMsg, io }: ReviewAppealInput): Promise<IAppeal> {
    if (![AppealStatus.APPROVED, AppealStatus.REJECTED].includes(status)) {
      throw AppError.badRequest('Status must be approved or rejected.', ErrorCode.APPEAL_INVALID_STATUS);
    }
    if (!adminMsg?.trim()) {
      throw AppError.badRequest('A message to the user is required.', ErrorCode.VALIDATION_ERROR);
    }

    const appeal = await this.appealRepo.updateStatus(appealId, status);
    if (!appeal) throw AppError.notFound('Appeal not found.', ErrorCode.APPEAL_NOT_FOUND);

    const appealUser = appeal.userId as { _id: string; email: string; firstName?: string; lastName?: string };

    if (status === AppealStatus.APPROVED && appealUser) {
      await this.setUserStatusUseCase.execute({
        userId: appealUser._id,
        action: 'activate',
        reason: 'Appeal approved',
        io,
      });
    }

    const userName = appealUser?.firstName
      ? `${appealUser.firstName} ${appealUser.lastName || ''}`.trim()
      : null;

    try {
      await this.emailService.sendAppealMessage(appealUser.email, {
        userName,
        message: adminMsg.trim(),
        appealType: appeal.type,
        appealStatus: status,
      });
    } catch (emailErr) {
      console.warn('⚠️ Appeal email failed:', (emailErr as Error).message);
    }

    if (io && appealUser?._id) {
      io.to(`user:${appealUser._id}`).emit('appeal_reviewed', {
        appealId: appeal._id,
        status,
        adminMsg: adminMsg.trim(),
        appealType: appeal.type,
      });
      io.to('admin').emit('appeal_updated', { appealId: appeal._id, status });
    }

    // Appeal status changed — all cached appeal query results are now stale.
    await cacheService.invalidatePattern('admin:appeals:*');

    return appeal;
  }
}

// ─── AdminLoginUseCase ──────────────────────────────────────────────────────
// Credentials come from env, never hardcoded in source.

interface AdminLoginInput { email: string; password: string }
interface AdminLoginOutput { email: string }

export class AdminLoginUseCase extends UseCase<AdminLoginInput, AdminLoginOutput> {
  // No real async work happens here (env var comparison is synchronous),
  // but execute() is declared `async` to satisfy the abstract base class's
  // Promise<TOutput> contract uniformly across every use case in the app.
  async execute({ email, password }: AdminLoginInput): Promise<AdminLoginOutput> {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL as string;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD as string;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      throw AppError.unauthorized('Invalid admin credentials.', ErrorCode.ADMIN_INVALID_CREDENTIALS);
    }

    return { email };
  }
}
