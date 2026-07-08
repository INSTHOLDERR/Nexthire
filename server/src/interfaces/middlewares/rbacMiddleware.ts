import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../domain/entities/enums';
import { ErrorCode } from '../../shared/errors/error-codes';


export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated.',
        code: ErrorCode.UNAUTHORIZED,
      });
      return;
    }

    if (!user.role) {
      res.status(403).json({
        success: false,
        message: 'Your account does not have a role assigned yet. Please complete onboarding.',
        code: ErrorCode.VALIDATION_ERROR,
      });
      return;
    }

    if (!roles.includes(user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
        code: ErrorCode.UNAUTHORIZED,
      });
      return;
    }

    next();
  };
};
