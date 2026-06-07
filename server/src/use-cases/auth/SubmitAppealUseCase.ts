import { IUserRepository } from '../../domain/repositories/user.repository';
import {  IAppealRepository } from '../../domain/repositories/appeal.repository';
import { IUploadService } from '../../domain/services/upload.service';
import { AppError } from './AuthUseCases';
import { Server } from 'socket.io';

interface SubmitAppealInput {
  userId: string;
  type: 'suspension' | 'ban';
  explanation: string;
  files: Express.Multer.File[];
  io?: Server;
}

export class SubmitAppealUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly appealRepo: IAppealRepository,
    private readonly uploadService: IUploadService
  ) {}

  async execute({ userId, type, explanation, files, io }: SubmitAppealInput) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError(404, 'User not found.');

    const existing = await this.appealRepo.findPending(userId, type);
    if (existing)
      throw new AppError(409, 'You already have a pending appeal. Please wait for admin review.');

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
