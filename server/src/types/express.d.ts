import { IUser } from '../domain/entities/user.types';

declare global {
  namespace Express {
    interface Request {
      user?: IUser & { id: string };
    }
  }
}

export {};
