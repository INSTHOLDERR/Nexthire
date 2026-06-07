import {Router, Request, Response, NextFunction,} from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { SetupProfileUseCase } from '../../use-cases/profile/SetupProfileUseCase';
import userRepo from '../../infrastructure/repositories/MongoUserRepository';
import uploadService from '../../infrastructure/services/CloudinaryService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const setupProfileUseCase = new SetupProfileUseCase( userRepo, uploadService );

router.put('/setup',protect, upload.single('profilePicture'),
  async ( req: Request,  res: Response,  next: NextFunction ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const user =
        await setupProfileUseCase.execute({
          userId: req.user.id,
          data:
            req.body as Record< string,string>,
          file: req.file,
        });

      return res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

