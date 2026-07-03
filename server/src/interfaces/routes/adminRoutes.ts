import { Router } from 'express';
import multer from 'multer';
import { adminLogin } from '../controllers/admin/AdminAuthController';
import { protectAdmin } from '../middlewares/adminMiddleware';
import { getUsers, setUserStatus, getAppeals, reviewAppeal, getUserAppeals } from '../controllers/admin/AdminController';
import { submitAppeal } from '../controllers/admin/AppealSubmissionController';
import { AppealType } from '../../domain/entities/enums';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Admin authentication
router.post('/login', adminLogin);

// Admin-protected routes
router.get('/users', protectAdmin, getUsers);
router.patch('/users/:userId/status', protectAdmin, setUserStatus);
router.get('/appeals', protectAdmin, getAppeals);
router.patch('/appeals/:appealId/review', protectAdmin, reviewAppeal);

// Appeal submission (by the affected user, not the admin)
router.post('/appeals/suspension', upload.array('evidence', 5), submitAppeal(AppealType.SUSPENSION));
router.post('/appeals/ban', upload.array('evidence', 5), submitAppeal(AppealType.BAN));

// Get a user's own appeals
router.get('/appeals/user/:userId', getUserAppeals);

export default router;
