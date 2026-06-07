import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../use-cases/auth/AuthUseCases';

interface ErrorUser {
  _id: string;
  email: string;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;
  banReason?: string;
  bannedAt?: Date;
}

export const notFound = ( req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export const errorHandler = ( err: Error | AppError, _req: Request, res: Response, _next: NextFunction): void => {
  const appErr = err as AppError;

  const statusCode =
    appErr.status || 500;

  const user =
    appErr.user as ErrorUser | undefined;

  let data;

  switch (appErr.code) {
    case 'SUSPENDED':
      if (user) {
        data = {
          userId: String(user._id),
          email: user.email,
          suspensionReason:
            user.suspensionReason,
          suspendedAt:
            user.suspendedAt,
          suspendedUntil:
            user.suspendedUntil,
        };
      }
      break;

    case 'BANNED':
      if (user) {
        data = {
          userId: String(user._id),
          email: user.email,
          banReason:
            user.banReason,
          bannedAt:
            user.bannedAt,
        };
      }
      break;
  }

  res.status(statusCode).json({
    success: false,
    message:
      err.message ||
      'Internal Server Error',
    code:
      appErr.code || null,
    data,
  });
};

