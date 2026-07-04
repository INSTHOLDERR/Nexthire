import { IUserRepository, UserFilter, PaginatedUsers } from '../../domain/repositories/user.repository';
import { IUser } from '../../domain/entities/user.types';
import { UserModel } from '../database/models/UserModel';
import { BaseRepository } from './BaseRepository';

export class MongoUserRepository extends BaseRepository<IUser> implements IUserRepository {
  protected mapToEntity(user: any): IUser {
    return {
      _id: user._id.toString(),
      email: user.email,
      password: user.password,
      googleId: user.googleId,
      authProvider: user.authProvider,
      isEmailVerified: user.isEmailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      status: user.status,
      suspensionReason: user.suspensionReason,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      matchPassword: user.matchPassword.bind(user),
    };
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ email });
    return user ? this.mapToEntity(user) : null;
  }

  async findById(id: string): Promise<IUser | null> {
    const user = await UserModel.findById(id);
    return user ? this.mapToEntity(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ googleId });
    return user ? this.mapToEntity(user) : null;
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const user = await UserModel.create(data);
    return this.mapToEntity(user);
  }

  async createWithHashedPassword(data: Partial<IUser>): Promise<IUser> {
    const user = await UserModel.create(data);
    return this.mapToEntity(user);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    const user = await UserModel.findByIdAndUpdate(id, data, { new: true });
    return user ? this.mapToEntity(user) : null;
  }

  async findAll(filter: UserFilter): Promise<PaginatedUsers> {
    const { search, status, role, page, limit } = filter;

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { email:     { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (role)   query.role   = role;

    const total = await UserModel.countDocuments(query);
    const docs  = await UserModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      users: docs.map((d) => this.mapToEntity(d)),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    };
  }
}

export default new MongoUserRepository();
