import { Router } from 'express';
import multer from 'multer';
import { adminLogin } from '../controllers/admin/AdminAuthController';
import { protectAdmin } from '../middlewares/adminMiddleware';
import { getUsers, setUserStatus, getAppeals, reviewAppeal, getUserAppeals } from '../controllers/admin/AdminController';
import { submitAppeal } from '../controllers/admin/AppealSubmissionController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});


router.post('/login', adminLogin);


router.get('/users', protectAdmin, getUsers);
router.patch('/users/:userId/status', protectAdmin, setUserStatus);
router.get('/appeals', protectAdmin, getAppeals);
router.patch('/appeals/:appealId/review', protectAdmin, reviewAppeal);


router.post('/appeals/suspension', upload.array('evidence', 5), submitAppeal('suspension'));
router.post('/appeals/ban', upload.array('evidence', 5), submitAppeal('ban'));


router.get('/appeals/user/:userId', getUserAppeals);

export default router;
