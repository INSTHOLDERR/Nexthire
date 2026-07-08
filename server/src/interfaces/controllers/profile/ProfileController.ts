import { Request, Response, NextFunction } from 'express';
import { SetupProfileUseCase } from '../../../use-cases/profile/SetupProfileUseCase';
import userRepo from '../../../infrastructure/repositories/MongoUserRepository';
import uploadService from '../../../infrastructure/services/CloudinaryService';
import { AppError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { WorkStatus } from '../../../domain/entities/enums';
import { UserResponseDTO } from '../../../use-cases/dto/user.dto';

const setupProfileUseCase = new SetupProfileUseCase(userRepo, uploadService);

export const setupProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.unauthorized('User not authenticated.', ErrorCode.UNAUTHORIZED);
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


export const setWorkStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw AppError.unauthorized('User not authenticated.', ErrorCode.UNAUTHORIZED);

    const { workStatus } = req.body as { workStatus: WorkStatus };
    if (!Object.values(WorkStatus).includes(workStatus)) {
      throw AppError.badRequest('Invalid work status value.', ErrorCode.VALIDATION_ERROR);
    }

    const current = await userRepo.findById(req.user.id);
    if (!current) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    const next_status = current.workStatus === workStatus ? WorkStatus.NONE : workStatus;

 
    const next_role =
      next_status === WorkStatus.OPEN_TO_WORK     ? 'jobseeker'
      : next_status === WorkStatus.CURRENTLY_HIRING ? 'recruiter'
      : 'user';
    const updated = await userRepo.update(req.user.id, { workStatus: next_status, role: next_role } as any);
    if (!updated) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    res.json({ success: true, data: new UserResponseDTO(updated) });
  } catch (err) {
    next(err);
  }
};
