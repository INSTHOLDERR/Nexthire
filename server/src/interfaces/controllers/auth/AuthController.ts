import { Request, Response, NextFunction } from 'express';
import {
  RegisterUseCase, LoginUseCase, VerifyOTPUseCase,
  GoogleAuthUseCase, ForgotPasswordUseCase, ResetPasswordUseCase,
} from '../../../use-cases/auth/AuthUseCases';
import userRepo from '../../../infrastructure/repositories/MongoUserRepository';
import otpRepo  from '../../../infrastructure/repositories/MongoOTPRepository';
import emailService from '../../../infrastructure/services/EmailService';
import { JWTService } from '../../../infrastructure/services/JWTService';
import { FirebaseAuthService } from '../../../infrastructure/services/FirebaseAuthService';

// Instantiate use cases with injected dependencies (DIP)
const tokenService    = new JWTService();
const firebaseAuth    = new FirebaseAuthService();

const registerUseCase = new RegisterUseCase(userRepo, otpRepo, emailService);
const loginUseCase  = new LoginUseCase(userRepo, otpRepo, emailService);
const verifyOTPUseCase = new VerifyOTPUseCase(userRepo, otpRepo, tokenService);
const googleAuthUseCase = new GoogleAuthUseCase(userRepo, tokenService, firebaseAuth);
const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepo, otpRepo, emailService);
const resetPasswordUseCase = new ResetPasswordUseCase(userRepo);

// register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
     res.status(201).json({ success: true, data: await registerUseCase.execute(req.body) }); 
    }
  catch (err) { 
    next(err); 
  }
};

// login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try { 
    res.json({ success: true, data: await loginUseCase.execute(req.body) }); 
  }
  catch (err) {
     next(err); 
    }
};


// verifyOTP
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
     res.json({ success: true, data: await verifyOTPUseCase.execute(req.body) }); 
    }
  catch (err) { 
    next(err);
   }
};

// googleAuth
export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
     res.json({ success: true, data: await googleAuthUseCase.execute(req.body) }); 
    }
  catch (err) {
     next(err); 
    }
};


// forgotPassword
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try { 
    res.json({ success: true, data: await forgotPasswordUseCase.execute(req.body) }); 
  }
  catch (err) { 
    next(err); 
  }
};

// resetPassword
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try { 
    res.json({ success: true, data: await resetPasswordUseCase.execute(req.body) }); 
  }
  catch (err) {
     next(err); 
    }
};
