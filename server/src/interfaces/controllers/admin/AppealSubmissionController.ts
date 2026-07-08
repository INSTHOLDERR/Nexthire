import { Request, Response, NextFunction } from 'express';
import { SubmitAppealUseCase } from '../../../use-cases/auth/SubmitAppealUseCase';
import userRepo from '../../../infrastructure/repositories/MongoUserRepository';
import appealRepo from '../../../infrastructure/repositories/MongoAppealRepository';
import uploadService from '../../../infrastructure/services/CloudinaryService';
import { AppError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { AppealType } from '../../../domain/entities/enums';

const submitAppealUseCase = new SubmitAppealUseCase(userRepo, appealRepo, uploadService);

export const submitAppeal = (type: AppealType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { explanation } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw AppError.unauthorized('Session error — sign in again to appeal.', ErrorCode.UNAUTHORIZED);
      }
      if (!explanation?.trim()) {
        throw AppError.badRequest('Explanation is required.', ErrorCode.VALIDATION_ERROR);
      }

      const appeal = await submitAppealUseCase.execute({
        userId,
        type,
        explanation,
        files: (req.files as Express.Multer.File[]) || [],
        io: req.app.locals.io,
      });

      res.status(201).json({ success: true, data: appeal });
    } catch (err) {
      next(err);
    }
  };
