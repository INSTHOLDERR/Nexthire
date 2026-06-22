import { Request, Response, NextFunction } from 'express';
import { SetupProfileUseCase } from '../../../use-cases/profile/SetupProfileUseCase';
import userRepo from '../../../infrastructure/repositories/MongoUserRepository';
import uploadService from '../../../infrastructure/services/CloudinaryService';
import { AppError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/error-codes';

const setupProfileUseCase = new SetupProfileUseCase(userRepo, uploadService);

export const setupProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated.', ErrorCode.UNAUTHORIZED);
    }

    const user = await setupProfileUseCase.execute({
      userId: req.user.id,
      data: req.body as Record<string, string>,
      file: req.file,
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
