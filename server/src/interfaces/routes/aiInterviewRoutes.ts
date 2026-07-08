import { Router, Request, Response } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { UserRole } from '../../domain/entities/enums';

const router = Router();


router.use(protect, requireRole(UserRole.JOBSEEKER, UserRole.RECRUITER));

router.get('/session', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'AI Mock Interview feature coming soon.',
      userId: req.user?.id,
      role: req.user?.role,
    },
  });
});

export default router;
