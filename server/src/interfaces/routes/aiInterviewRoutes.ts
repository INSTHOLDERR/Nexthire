import { Router, Request, Response } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { UserRole } from '../../domain/entities/enums';

const router = Router();

/**
 * All AI interview routes require:
 * 1. protect   — must be logged in
 * 2. requireRole(JOBSEEKER, RECRUITER) — must be a job seeker or recruiter
 *
 * Why these two?
 * - JOBSEEKER: prepares for interviews using the AI mock interview tool
 * - RECRUITER: uses AI interview tools to pre-screen candidates
 * - STUDENT has no job-market context yet in this platform
 *
 * The actual LangChain/GPT-4 powered interview session will be built
 * in a future session (requires WebRTC or WebSocket stream integration).
 */
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
