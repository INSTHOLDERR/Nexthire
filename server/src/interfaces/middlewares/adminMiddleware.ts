import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ErrorCode } from '../../shared/errors/error-codes';

const adminSecret = () => (process.env.JWT_SECRET as string) + '_admin';

export const protectAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Admin not authorized.', code: ErrorCode.ADMIN_UNAUTHORIZED });
    return;
  }

  try {
    jwt.verify(auth.split(' ')[1], adminSecret());
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Admin token invalid.', code: ErrorCode.TOKEN_INVALID });
  }
};

export const signAdminToken = (email: string): string => {
  return jwt.sign({ role: 'admin', email }, adminSecret(), { expiresIn: '8h' });
};
