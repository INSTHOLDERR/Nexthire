
import {Router, Request, Response, NextFunction,} from 'express';
import multer from 'multer';
import { adminLogin, protectAdmin,} from '../middlewares/adminMiddleware';
import { getUsers, setUserStatus, getAppeals, reviewAppeal,} from '../controllers/admin/AdminController';
import { SubmitAppealUseCase } from '../../use-cases/auth/SubmitAppealUseCase';
import userRepo from '../../infrastructure/repositories/MongoUserRepository';
import appealRepo from '../../infrastructure/repositories/MongoAppealRepository';
import uploadService from '../../infrastructure/services/CloudinaryService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const submitAppealUseCase = new SubmitAppealUseCase(  userRepo, appealRepo, uploadService );
const badRequest = ( res: Response, message: string) => {
  return res.status(400).json({
    success: false,
    message,
  });
};

// Admin Authentication
router.post('/login', adminLogin);

// Admin Protected Routes
router.get('/users',protectAdmin,getUsers);
router.patch('/users/:userId/status',protectAdmin,setUserStatus);
router.get('/appeals',protectAdmin, getAppeals);
router.patch('/appeals/:appealId/review', protectAdmin, reviewAppeal);

// Appeal Submission
const appealHandler =( type: | 'suspension' | 'ban') =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {  userId,  explanation,} = req.body;
      if (!userId?.trim()) {
        return badRequest(   res, 'User ID is required' );
      }

      if (!explanation?.trim()) {
        return badRequest(  res,'Explanation is required' );
      }

      const appeal =
        await submitAppealUseCase.execute({ userId, type,explanation, files: (
              req.files as Express.Multer.File[] ) || [],
          io: req.app.locals.io,
        });

      return res.status(201).json({ success: true, data: appeal, });
    } catch (err) {
      next(err);
    }
  };

router.post( '/appeals/suspension', upload.array( 'evidence', 5),appealHandler( 'suspension' ));
router.post('/appeals/ban',upload.array('evidence', 5),appealHandler('ban'));

// Get User Appeals
router.get( '/appeals/user/:userId',
  async ( req: Request, res: Response, next: NextFunction) => {
    try {
      const appeals =
        await appealRepo.findByUserId(
          req.params.userId
        );

      return res.json({
        success: true,
        data: appeals,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

