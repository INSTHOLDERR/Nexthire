
import { Request, Response, NextFunction } from 'express';
import {GetUsersUseCase, SetUserStatusUseCase, GetAppealsUseCase} from '../../../use-cases/admin/AdminUseCases';
import userRepo from '../../../infrastructure/repositories/MongoUserRepository';
import appealRepo from '../../../infrastructure/repositories/MongoAppealRepository';
import emailService from '../../../infrastructure/services/EmailService';

const getUsersUseCase = new GetUsersUseCase();

const setUserStatusUseCase = new SetUserStatusUseCase(
    userRepo,
    emailService
  );

const getAppealsUseCase = new GetAppealsUseCase(
    appealRepo
  );

const success = ( res: Response, data: unknown) => {
  return res.json({
    success: true,
    data,
  });
};

const error = ( res: Response, statusCode: number,message: string) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export const getUsers = async ( req: Request, res: Response, next: NextFunction) => {
  try {
    const {page, limit,search,} = req.query as Record<string,string>;
    const pageNumber =Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    const users =  await getUsersUseCase.execute({
        page: pageNumber,
        limit: limitNumber,
        search,
      });

    return success(res,users);
  } catch (err) {
    next(err);
  }
};

export const setUserStatus = async (req: Request,res: Response,next: NextFunction) => {
  try {
    const { userId } = req.params;
    const io = req.app.locals.io;
    const user = await setUserStatusUseCase.execute({ userId, ...req.body, io, });

    if (io) {
      io.to('admin').emit('user_status_changed',
        {
          userId: user?._id,
          status: user?.status,
        }
      );
    }

    return success(res, user);
  } catch (err) {
    next(err);
  }
};

export const getAppeals = async ( req: Request, res: Response,next: NextFunction) => {
  try {
    const appeals =await getAppealsUseCase.execute();
    return success( res, appeals);
  } catch (err) {
    next(err);
  }
};

export const reviewAppeal = async( req: Request,res: Response,next: NextFunction) => {
  try {
    const { appealId } = req.params;
    const {status, adminMsg,} = req.body as {
      status:| 'approved'| 'rejected';
      adminMsg: string;
    };

    if (!['approved','rejected',].includes(status)) {
      return error(
        res, 400, 'Status must be approved or rejected'
      );
    }

    if (!adminMsg?.trim()) {
      return error( 
        res,400, 'A message to the user is required'
      );
    }

    const appeal = await appealRepo.updateStatus(appealId,status );

    if (!appeal) {
      return error(
        res, 404, 'Appeal not found'
      );
    }

    const io = req.app.locals.io;

    const appealUser =appeal.userId as {
        _id: string;
        email: string;
        firstName?: string;
        lastName?: string;
      };

    if (status === 'approved' && appealUser) {
      await setUserStatusUseCase.execute({
        userId: appealUser._id,
        action: 'activate',
        reason:'Appeal approved',
        io,
      });
    }

    const userName =appealUser?.firstName? `${appealUser.firstName} ${appealUser.lastName || '' }`.trim() : null;

    try {
      await emailService.sendAppealMessage(
        appealUser.email,
        {
          userName,
          message: adminMsg.trim(),
          appealType: appeal.type,
          appealStatus:status,
        }
      );
    } catch (emailErr) {
      console.warn(
        '⚠️ Appeal email failed:',
        (
          emailErr as Error
        ).message
      );
    }

    if (  io &&  appealUser?._id ) {
      io.to( `user:${appealUser._id}`).emit(
        'appeal_reviewed',
        {
          appealId: appeal._id, status,
          adminMsg: adminMsg.trim(),
          appealType: appeal.type,
        }
      );
    }

    if (io) {
      io.to('admin').emit(
        'appeal_updated',
        {
          appealId:appeal._id, status,
        }
      );
    }

    return success(
      res, appeal
    );
  } catch (err) {
    next(err);
  }
};

