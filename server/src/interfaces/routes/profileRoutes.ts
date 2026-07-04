import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { setupProfile } from '../controllers/profile/ProfileController';
import { UserRole } from '../../domain/entities/enums';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Profile setup is available to all authenticated users regardless of role
// (role gets assigned AS PART of profile setup, so we can't require it yet).
router.put('/setup', protect, upload.single('profilePicture'), setupProfile);

export default router;
