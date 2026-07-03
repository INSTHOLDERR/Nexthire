import { Router } from 'express';
import multer from 'multer';
import { adminLogin } from '../controllers/admin/AdminAuthController';
import { protectAdmin } from '../middlewares/adminMiddleware';
import { protect, protectAllowRestricted } from '../middlewares/authMiddleware';
import { getUsers, setUserStatus, getAppeals, reviewAppeal, getUserAppeals } from '../controllers/admin/AdminController';
import { submitAppeal } from '../controllers/admin/AppealSubmissionController';
import { AppealType } from '../../domain/entities/enums';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Admin authentication (public)
router.post('/login', adminLogin);

// Admin-protected routes
router.get('/users', protectAdmin, getUsers);
router.patch('/users/:userId/status', protectAdmin, setUserStatus);
router.get('/appeals', protectAdmin, getAppeals);
router.patch('/appeals/:appealId/review', protectAdmin, reviewAppeal);
router.get('/appeals/user/:userId', protectAdmin, getUserAppeals);

// Appeal submission — requires a valid user JWT but allows banned/suspended
// users through (they are exactly who needs to submit an appeal).
// protectAllowRestricted verifies the token without blocking on status.
router.post('/appeals/suspension', protectAllowRestricted, upload.array('evidence', 5), submitAppeal(AppealType.SUSPENSION));
router.post('/appeals/ban', protectAllowRestricted, upload.array('evidence', 5), submitAppeal(AppealType.BAN));

export default router;
