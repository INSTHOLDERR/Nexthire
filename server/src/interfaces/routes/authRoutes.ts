import { Router } from 'express';
import { register, login, verifyOTP, googleAuth, forgotPassword, resetPassword, resendOTP } from '../controllers/auth/AuthController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOTP);

export default router;
