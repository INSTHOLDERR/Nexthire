import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ADMIN_EMAIL    = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Nikhil@425';
const adminSecret    = () => (process.env.JWT_SECRET as string) + '_admin';


// adminLogin
export const adminLogin = (req: Request, res: Response): void => {
  const { email, password } = req.body as { email: string; password: string };
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    res.status(401).json({ 
      success: false, message: 'Invalid admin credentials' 
    });
    return;
  }
  const token = jwt.sign({ role: 'admin', email }, adminSecret(), { expiresIn: '8h' });
  res.json({ success: true, token });
};


// protectAdmin
export const protectAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { 
    res.status(401).json({ message: 'Admin not authorized.' }); return; 
  }
  try {
    jwt.verify(auth.split(' ')[1], adminSecret());
    next();
  } catch {
    res.status(401).json({ message: 'Admin token invalid.' });
  }
};
