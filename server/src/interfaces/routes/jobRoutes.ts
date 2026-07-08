import { Router, Request, Response } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { UserRole } from '../../domain/entities/enums';

const router = Router();


router.use(protect, requireRole(UserRole.JOBSEEKER, UserRole.RECRUITER));

router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      jobs: [],
      total: 0,
      page: 1,
      pages: 1,
      message: 'Jobs feature coming soon. Route is protected and accessible.',
    },
  });
});

export default router;
