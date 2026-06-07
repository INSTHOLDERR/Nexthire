import { Router } from 'express';
import { register, login, verifyOTP, googleAuth, forgotPassword, resetPassword } from '../controllers/auth/AuthController';

const router = Router();

router.post('/register',        register);
router.post('/login',           login);
router.post('/verify-otp',      verifyOTP);
router.post('/google',          googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

export default router;
