import { IUserRepository } from '../../domain/repositories/user.repository';
import { IUploadService } from '../../domain/services/upload.service';
import { IUser } from '../../domain/entities/user.types';
import { AppError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/error-codes';
import { UseCase } from '../UseCase';
import { UserRole, WorkStatus } from '../../domain/entities/enums';

interface SetupProfileInput {
  userId: string;
  data: Record<string, string>;
  file?: Express.Multer.File;
}

const ALLOWED_ROLE_VALUES = new Set([...Object.values(UserRole), 'user'] as string[]);
const ALLOWED_WORK_STATUS = new Set(Object.values(WorkStatus));

export class SetupProfileUseCase extends UseCase<SetupProfileInput, IUser> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uploadService: IUploadService
  ) {
    super();
  }

  async execute({ userId, data, file }: SetupProfileInput): Promise<IUser> {
    const update: Record<string, unknown> = {};

    // ── Profile picture ─────────────────────────────────────────────────────
    if (file) {
      const url = await this.uploadService.uploadImage(file.buffer, 'profiles');
      update.profilePicture = url;
    } else if (data.existingProfilePicture) {
      update.profilePicture = data.existingProfilePicture;
    }

    const simpleFields = ['firstName', 'lastName', 'phone', 'location'] as const;
    for (const key of simpleFields) {
      if (data[key] !== undefined) update[key] = data[key].trim();
    }

    // ── Role ─────────────────────────────────────────────────────────────────
    if (data.role && ALLOWED_ROLE_VALUES.has(data.role as UserRole)) {
      update.role = data.role as UserRole;
    }


    const contextFields = [
      'jobTitle', 'company', 'school', 'degree', 'fieldOfStudy', 'startYear',
    ] as const;
    for (const key of contextFields) {
      if (data[key] !== undefined) update[key] = data[key].trim();
    }

    // ── Headline — auto-built from role + context fields ────────────────────
   
    const headline = this.buildHeadline(data);
    if (headline) update.headline = headline;

    // ── Work status ──────────────────────────────────────────────────────────
    if (data.workStatus && ALLOWED_WORK_STATUS.has(data.workStatus as WorkStatus)) {
      update.workStatus = data.workStatus;
    }

    // ── Onboarding complete flag ─────────────────────────────────────────────
    if (data.onboardingComplete === 'true') {
      update.onboardingComplete = true;
    }

    const user = await this.userRepo.update(userId, update as Partial<IUser>);
    if (!user) throw AppError.notFound('User not found.', ErrorCode.USER_NOT_FOUND);

    return user;
  }

  private buildHeadline(data: Record<string, string>): string {
    const role = data.role;

    if (role === UserRole.JOBSEEKER) {
      const parts = [data.jobTitle?.trim(), data.company?.trim()].filter(Boolean);
      return parts.join(' at ');
    }

    if (role === UserRole.RECRUITER) {
    
      const parts = [data.jobTitle?.trim(), data.company?.trim()].filter(Boolean);
      return parts.join(' at ');
    }

    if (role === UserRole.STUDENT) {
      const parts: string[] = [];
      if (data.degree?.trim())       parts.push(data.degree.trim());
      if (data.fieldOfStudy?.trim()) parts.push(`in ${data.fieldOfStudy.trim()}`);
      if (data.school?.trim())       parts.push(`at ${data.school.trim()}`);
      if (data.startYear?.trim())    parts.push(`(${data.startYear.trim()})`);
      return parts.join(' ');
    }

    if (data.jobTitle?.trim()) return data.jobTitle.trim();
    return '';
  }
}
