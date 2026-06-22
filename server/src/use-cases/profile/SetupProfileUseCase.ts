import { IUserRepository } from '../../domain/repositories/user.repository';
import { IUploadService } from '../../domain/services/upload.service';
import { IUser } from '../../domain/entities/user.types';
import { AppError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/error-codes';
import { UseCase } from '../UseCase';

interface SetupProfileInput {
  userId: string;
  data: Record<string, string>;
  file?: Express.Multer.File;
}

const BOOLEAN_FIELDS = ['onboardingComplete'] as const;

export class SetupProfileUseCase extends UseCase<SetupProfileInput, IUser> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uploadService: IUploadService
  ) {
    super();
  }

  async execute({ userId, data, file }: SetupProfileInput): Promise<IUser> {
    const { existingProfilePicture, ...rest } = data;
    const update: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rest)) {
      update[key] = (BOOLEAN_FIELDS as readonly string[]).includes(key) ? value === 'true' : value;
    }

    if (file) {
      update.profilePicture = await this.uploadService.uploadImage(file.buffer, 'profiles');
    } else if (existingProfilePicture) {
      update.profilePicture = existingProfilePicture;
    }

    const user = await this.userRepo.update(userId, update as any);
    if (!user) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    return user;
  }
}
