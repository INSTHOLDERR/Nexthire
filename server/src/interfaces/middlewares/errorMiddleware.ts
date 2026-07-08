import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/error-codes';
import jwtService from '../../infrastructure/services/JWTService';

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: ErrorCode.NOT_FOUND,
  });
};

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    let data = err.data as Record<string, unknown> | undefined;
    if (
      (err.code === ErrorCode.ACCOUNT_SUSPENDED || err.code === ErrorCode.ACCOUNT_BANNED) &&
      data && typeof data.userId === 'string'
    ) {
      data = { ...data, appealToken: jwtService.generate(data.userId) };
    }
    res.status(err.status).json({ success: false, message: err.message, code: err.code, data });
    return;
  }

  if ((err as any).code === 11000) {
    res.status(409).json({ success: false, message: 'Duplicate entry.', code: ErrorCode.EMAIL_EXISTS });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error', code: ErrorCode.INTERNAL_ERROR });
};
