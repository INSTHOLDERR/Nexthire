import { Request, Response, NextFunction } from 'express';
import jwtService from '../../infrastructure/services/JWTService';
import userRepo from '../../infrastructure/repositories/MongoUserRepository';
import { ErrorCode } from '../../shared/errors/error-codes';
import { UserStatus } from '../../domain/entities/enums';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Not authorized.', code: ErrorCode.UNAUTHORIZED });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwtService.verify(token);
    const user = await userRepo.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found.', code: ErrorCode.USER_NOT_FOUND });
      return;
    }

    if (user.status === UserStatus.BANNED) {
      res.status(403).json({
        success: false,
        code: ErrorCode.ACCOUNT_BANNED,
        message: 'Your account has been permanently banned.',
        data: {
          userId: String(user._id),
          email: user.email,
          banReason: user.banReason,
          bannedAt: user.bannedAt,
        },
      });
      return;
    }

    if (user.status === UserStatus.SUSPENDED) {
      res.status(403).json({
        success: false,
        code: ErrorCode.ACCOUNT_SUSPENDED,
        message: 'Your account has been suspended.',
        data: {
          userId: String(user._id),
          email: user.email,
          suspensionReason: user.suspensionReason,
          suspendedAt: user.suspendedAt,
          suspendedUntil: user.suspendedUntil,
        },
      });
      return;
    }

    req.user = { ...user, id: String(user._id) };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid or expired.', code: ErrorCode.TOKEN_INVALID });
  }
};

/**
 * Lighter protect middleware used specifically for appeal submission routes.
 * Verifies the JWT and sets req.user, but does NOT block based on
 * account status — because banned/suspended users are exactly the ones
 * who need to submit an appeal. The use case validates status internally.
 */
export const protectAllowRestricted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Not authorized.', code: ErrorCode.UNAUTHORIZED });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwtService.verify(token);
    const user = await userRepo.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found.', code: ErrorCode.USER_NOT_FOUND });
      return;
    }

    // Deliberately does NOT check user.status here.
    req.user = { ...user, id: String(user._id) };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid or expired.', code: ErrorCode.TOKEN_INVALID });
  }
};
