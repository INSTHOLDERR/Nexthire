import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { setupProfile } from '../controllers/profile/ProfileController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.put('/setup', protect, upload.single('profilePicture'), setupProfile);

export default router;
