import { IUser } from '../entities/user.types';

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  findByGoogleId(googleId: string): Promise<IUser | null>;

  create(data: Partial<IUser>): Promise<IUser>;
  createWithHashedPassword(data: Partial<IUser>): Promise<IUser>;

  update(id: string, data: Partial<IUser>): Promise<IUser | null>;

  findAll(filter: { search?: string; page: number; limit: number }): Promise<{
    users: IUser[];
    total: number;
  }>;
}
