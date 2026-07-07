import { Router } from 'express';
import authRoutes        from './authRoutes';
import profileRoutes     from './profileRoutes';
import adminRoutes       from './adminRoutes';
import postRoutes        from './postRoutes';
import socialRoutes      from './socialRoutes';
import jobRoutes         from './jobRoutes';
import aiInterviewRoutes from './aiInterviewRoutes';

const router = Router();

router.use('/auth',         authRoutes);
router.use('/profile',      profileRoutes);
router.use('/admin',        adminRoutes);
router.use('/posts',        postRoutes);
router.use('/social',       socialRoutes);
router.use('/jobs',         jobRoutes);
router.use('/ai-interview', aiInterviewRoutes);

export default router;
