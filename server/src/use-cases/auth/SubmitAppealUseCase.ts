import { IUserRepository } from '../../domain/repositories/user.repository';
import { IAppealRepository } from '../../domain/repositories/appeal.repository';
import { IAppeal } from '../../domain/entities/appeal.types';
import { IUploadService } from '../../domain/services/upload.service';
import { AppError } from '../../shared/errors/AppError';
import { UserStatus, AppealType } from '../../domain/entities/enums';
import { ErrorCode } from '../../shared/errors/error-codes';
import { Server } from 'socket.io';
import { UseCase } from '../UseCase';

interface SubmitAppealInput {
  userId: string;
  type: AppealType;
  explanation: string;
  files: Express.Multer.File[];
  io?: Server;
}

export class SubmitAppealUseCase extends UseCase<SubmitAppealInput, IAppeal> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly appealRepo: IAppealRepository,
    private readonly uploadService: IUploadService
  ) {
    super();
  }

  async execute({ userId, type, explanation, files, io }: SubmitAppealInput): Promise<IAppeal> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    if (type === AppealType.BAN && user.status !== UserStatus.BANNED) {
      throw AppError.badRequest('This account is not currently banned.', ErrorCode.APPEAL_NOT_ALLOWED);
    }
    if (type === AppealType.SUSPENSION && user.status !== UserStatus.SUSPENDED) {
      throw AppError.badRequest('This account is not currently suspended.', ErrorCode.APPEAL_NOT_ALLOWED);
    }

    const existing = await this.appealRepo.findPending(userId, type);
    if (existing) {
      throw AppError.conflict(
        'You already have a pending appeal. Please wait for admin review.',
        ErrorCode.APPEAL_ALREADY_PENDING
      );
    }

    const evidence: string[] = [];
    for (const file of files ?? []) {
      try {
        const url = await this.uploadService.uploadImage(file.buffer, 'appeals');
        evidence.push(url);
      } catch (err) {
        console.warn('⚠️ Evidence upload failed:', (err as Error).message);
      }
    }

    const appeal = await this.appealRepo.create({ userId, type, explanation, evidence });
    const populated = await this.appealRepo.findById(appeal._id);

    if (io) io.to('admin').emit('new_appeal', populated);

    return appeal;
  }
}
