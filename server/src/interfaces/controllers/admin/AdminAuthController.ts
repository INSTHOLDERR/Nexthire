import { Request, Response, NextFunction } from 'express';
import { AdminLoginUseCase } from '../../../use-cases/admin/AdminUseCases';
import { signAdminToken } from '../../middlewares/adminMiddleware';

const adminLoginUseCase = new AdminLoginUseCase();

export const adminLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = await adminLoginUseCase.execute(req.body);
    const token = signAdminToken(email);
    res.json({ success: true, token });
  } catch (err) {
    next(err);
  }
};
