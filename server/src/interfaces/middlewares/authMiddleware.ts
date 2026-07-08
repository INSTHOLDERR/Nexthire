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
          appealToken: jwtService.generate(String(user._id)),
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
          appealToken: jwtService.generate(String(user._id)),
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


    req.user = { ...user, id: String(user._id) };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid or expired.', code: ErrorCode.TOKEN_INVALID });
  }
};
