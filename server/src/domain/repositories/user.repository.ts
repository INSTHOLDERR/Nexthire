import { IUser } from '../entities/user.types';
import { UserStatus, UserRole } from '../entities/enums';

export interface UserFilter {
  search?: string;
  status?: UserStatus;
  role?: UserRole;
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  users: IUser[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  findByGoogleId(googleId: string): Promise<IUser | null>;

  create(data: Partial<IUser>): Promise<IUser>;
  createWithHashedPassword(data: Partial<IUser>): Promise<IUser>;

  update(id: string, data: Partial<IUser>): Promise<IUser | null>;

  findAll(filter: UserFilter): Promise<PaginatedUsers>;
}
