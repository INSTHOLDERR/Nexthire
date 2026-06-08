import { IUserRepository } from '../../domain/repositories/user.repository';
import { IAppealRepository } from '../../domain/repositories/appeal.repository';
import { IEmailService } from '../../domain/services/email.service';
import { AppError } from '../auth/AuthUseCases';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { Server } from 'socket.io';

// GetUsersUseCase
interface GetUsersInput { page?: number; limit?: number; search?: string }

export class GetUsersUseCase {
  async execute({ page = 1, limit = 20, search = '' }: GetUsersInput) {
    const query = search ? { $or: [{ email: { $regex: search, $options: 'i' } }, { firstName: { $regex: search, $options: 'i' } }] }: {};
    const total = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
      .select('email firstName lastName profilePicture status suspensionReason suspendedAt suspendedUntil banReason bannedAt createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }
}

// SetUserStatusUseCase 
interface SetUserStatusInput {
  userId: string;
  action: 'ban' | 'suspend' | 'activate';
  reason?: string;
  suspendDays?: number | string;
  io?: Server;
}

export class SetUserStatusUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute({ userId, action, reason, suspendDays, io }: SetUserStatusInput) {
    let update: Record<string, unknown> = {};

    if (action === 'ban') {
      update = { status: 'banned', banReason: reason || 'Violated terms of service', bannedAt: new Date() };
    } else if (action === 'suspend') {
      const until = new Date();
      until.setDate(until.getDate() + (parseInt(String(suspendDays)) || 7));
      update = { status: 'suspended', suspensionReason: reason || 'Temporary suspension', suspendedAt: new Date(), suspendedUntil: until };
    } else if (action === 'activate') {
      update = { status: 'active', suspensionReason: null, suspendedAt: null, suspendedUntil: null, banReason: null, bannedAt: null };
    } else {
      throw new AppError(400, 'Invalid action');
    }

    const user = await this.userRepo.update(userId, update as any);
    if (!user) throw new AppError(404, 'User not found');

    if (io) {
      if (action === 'ban') {
        io.to(`user:${userId}`).emit('account_status_changed',{code:'BANNED',data:{ banReason: update.banReason,bannedAt: update.bannedAt } });
      } else if (action === 'suspend') {
        io.to(`user:${userId}`).emit('account_status_changed',{code:'SUSPENDED',data:{ userId: String(user._id), suspensionReason: update.suspensionReason, suspendedAt: update.suspendedAt, suspendedUntil: update.suspendedUntil } });
      } else if (action === 'activate') {
        io.to(`user:${userId}`).emit('account_status_changed',{code:'ACTIVE' });
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

    return user;
  }
}

// GetAppealsUseCase
export class GetAppealsUseCase {
  constructor(private readonly appealRepo: IAppealRepository) {}
  execute() { return this.appealRepo.findAll(); }
}
