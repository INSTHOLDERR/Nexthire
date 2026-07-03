import { Request, Response, NextFunction } from 'express';
import { GetUsersUseCase, SetUserStatusUseCase, GetAppealsUseCase, ReviewAppealUseCase } from '../../../use-cases/admin/AdminUseCases';
import userRepo from '../../../infrastructure/repositories/MongoUserRepository';
import appealRepo from '../../../infrastructure/repositories/MongoAppealRepository';
import emailService from '../../../infrastructure/services/EmailService';
import { AppealStatus } from '../../../domain/entities/enums';

const getUsersUseCase = new GetUsersUseCase(userRepo);
const setUserStatusUseCase = new SetUserStatusUseCase(userRepo, emailService);
const getAppealsUseCase = new GetAppealsUseCase(appealRepo);
const reviewAppealUseCase = new ReviewAppealUseCase(appealRepo, setUserStatusUseCase, emailService);

const success = (res: Response, data: unknown) => res.json({ success: true, data });

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const result = await getUsersUseCase.execute({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const setUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const io = req.app.locals.io;
    const user = await setUserStatusUseCase.execute({ userId, ...req.body, io });
    return success(res, user);
  } catch (err) {
    next(err);
  }
};

export const getAppeals = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const appeals = await getAppealsUseCase.execute();
    return success(res, appeals);
  } catch (err) {
    next(err);
  }
};

export const reviewAppeal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appealId } = req.params;
    const { status, adminMsg } = req.body as { status: AppealStatus.APPROVED | AppealStatus.REJECTED; adminMsg: string };
    const io = req.app.locals.io;

    const appeal = await reviewAppealUseCase.execute({ appealId, status, adminMsg, io });
    return success(res, appeal);
  } catch (err) {
    next(err);
  }
};

export const getUserAppeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appeals = await appealRepo.findByUserId(req.params.userId);
    return success(res, appeals);
  } catch (err) {
    next(err);
  }
};
