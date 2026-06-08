import { IUserRepository } from '../../domain/repositories/user.repository';
import { IUploadService } from '../../domain/services/upload.service';

interface SetupProfileInput {
  userId: string;
  data: Record<string, string>;
  file?: Express.Multer.File;
}

// Fields that are Boolean in the Mongoose schema — must be cast from FormData strings
const BOOLEAN_FIELDS = ['onboardingComplete', 'openToWork', 'isHiring'] as const;

export class SetupProfileUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uploadService: IUploadService
  ) {}

  async execute({ userId, data, file }: SetupProfileInput) {
    const { existingProfilePicture, ...rest } = data;
    const update: Record<string, unknown> = {};

    
    for (const [key, value] of Object.entries(rest)) {
      if ((BOOLEAN_FIELDS as readonly string[]).includes(key)) {
        update[key] = value === 'true';
      } else {
        update[key] = value;
      }
    }

    if (file) {
      // New file uploaded — upload to Cloudinary
      update.profilePicture = await this.uploadService.uploadImage(file.buffer, 'profiles');
    } else if (existingProfilePicture) {
      // No new file — preserve existing picture google pic will exists
      update.profilePicture = existingProfilePicture;
    }
    return this.userRepo.update(userId, update as any);
  }
}
