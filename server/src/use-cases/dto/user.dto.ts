import { IUser } from '../../domain/entities/user.types';
import { UserStatus, WorkStatus } from '../../domain/entities/enums';

export class UserResponseDTO {
  readonly id: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly profilePicture?: string;
  readonly headline?: string;
  readonly role?: string;
  readonly workStatus: WorkStatus;
  readonly onboardingComplete: boolean;
  readonly status: UserStatus;
  // Context fields
  readonly phone?: string;
  readonly location?: string;
  readonly company?: string;
  readonly jobTitle?: string;
  readonly school?: string;
  readonly degree?: string;
  readonly fieldOfStudy?: string;
  readonly startYear?: string;

  constructor(user: IUser) {
    this.id                 = user._id;
    this.email              = user.email;
    this.firstName          = user.firstName;
    this.lastName           = user.lastName;
    this.profilePicture     = user.profilePicture;
    this.headline           = user.headline;
    this.role               = user.role;
    this.workStatus         = user.workStatus ?? WorkStatus.NONE;
    this.onboardingComplete = user.onboardingComplete;
    this.status             = user.status;
    this.phone              = user.phone;
    this.location           = user.location;
    this.company            = user.company;
    this.jobTitle           = user.jobTitle;
    this.school             = user.school;
    this.degree             = user.degree;
    this.fieldOfStudy       = user.fieldOfStudy;
    this.startYear          = user.startYear;
  }
}

export class AuthResponseDTO {
  readonly token: string;
  readonly user: UserResponseDTO;

  constructor(token: string, user: IUser) {
    this.token = token;
    this.user  = new UserResponseDTO(user);
  }
}

export class PendingAuthDTO {
  readonly email: string;
  constructor(email: string) { this.email = email; }
}

export class MessageDTO {
  readonly message: string;
  constructor(message: string) { this.message = message; }
}

export class OTPVerifiedDTO {
  readonly verified: true = true;
  readonly email: string;
  constructor(email: string) { this.email = email; }
}
