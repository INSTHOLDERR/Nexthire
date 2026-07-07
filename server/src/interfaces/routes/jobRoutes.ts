import { Router, Request, Response } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { UserRole } from '../../domain/entities/enums';

const router = Router();

/**
 * All jobs routes require:
 * 1. protect   — must be logged in with a valid JWT
 * 2. requireRole(JOBSEEKER, RECRUITER) — must have one of these two roles
 *
 * Why these two roles?
 * - JOBSEEKER: browsing and applying for jobs is their core purpose
 * - RECRUITER: posting jobs and viewing applicants is their core purpose
 * - STUDENT has no role-based need for the jobs board in this platform
 *
 * The actual job listings, job applications, and recruiter dashboards
 * will be built here in a future session. These are placeholder handlers
 * that return the correct shape so the frontend route guard works today.
 */
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
