import { Request, Response, NextFunction } from 'express';

import jwtService from '../../infrastructure/services/JWTService';
import userRepo from '../../infrastructure/repositories/MongoUserRepository';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader =
    req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
    return;
  }

  try {
    const token =  authHeader.split(' ')[1];
    const decoded = jwtService.verify(token);
    const user =await userRepo.findById( decoded.id );

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.status === 'banned') {
      res.status(403).json({
        success: false,
        code: 'BANNED',
        message:'Your account has been permanently banned.',
        data: {
          userId: String(user._id),
          email: user.email,
          banReason: user.banReason,
          bannedAt: user.bannedAt,
        },
      });
      return;
    }

    if ( user.status === 'suspended' ) {
      res.status(403).json({
        success: false,
        code: 'SUSPENDED',
        message: 'Your account has been suspended.',
        data: {
          userId: String(
            user._id
          ),
          email: user.email,
          suspensionReason: user.suspensionReason,
          suspendedAt: user.suspendedAt,
          suspendedUntil: user.suspendedUntil,
        },
      });

      return;
    }

    req.user = {...user, id: String(user._id),};

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Token invalid or expired',
    });
  }
};


