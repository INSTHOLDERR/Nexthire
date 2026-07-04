import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../domain/entities/enums';
import { ErrorCode } from '../../shared/errors/error-codes';

/**
 * RBAC middleware factory — Role-Based Access Control.
 *
 * Usage: requireRole(UserRole.JOBSEEKER, UserRole.STUDENT)
 *
 * MUST be placed AFTER `protect` or `protectAllowRestricted` in the
 * middleware chain, because it reads `req.user` which those middlewares
 * set. Calling requireRole without protect before it will always 403.
 *
 * Why this exists:
 * `protect` only answers "are you logged in?" (authentication).
 * `requireRole` answers "are you allowed to do this?" (authorization).
 * These are two separate questions that must be kept separate — mixing
 * them into one middleware would violate Single Responsibility and make
 * it impossible to reuse either independently.
 */
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
