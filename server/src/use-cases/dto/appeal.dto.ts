import { IAppeal } from '../../domain/entities/appeal.types';
import { AppealStatus, AppealType } from '../../domain/entities/enums';

/**
 * AppealResponseDTO — shapes the appeal data sent back to either the
 * user (after submitting) or the admin (in the appeals list).
 * Populated userId is typed as a nested object since we always populate
 * the user reference when returning appeals to admin.
 */
export class AppealResponseDTO {
  readonly id: string;
  readonly type: AppealType;
  readonly explanation: string;
  readonly evidence: string[];
  readonly status: AppealStatus;
  readonly adminNote: string;
  readonly createdAt: Date;
  readonly userId: string | {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    status: string;
  };

  constructor(appeal: IAppeal) {
    this.id          = appeal._id;
    this.type        = appeal.type;
    this.explanation = appeal.explanation;
    this.evidence    = appeal.evidence;
    this.status      = appeal.status;
    this.adminNote   = appeal.adminNote;
    this.createdAt   = appeal.createdAt;

    // userId is either a plain string (not populated) or a populated user document
    const uid = appeal.userId as any;
    if (typeof uid === 'string') {
      this.userId = uid;
    } else {
      this.userId = {
        id:             String(uid._id),
        email:          uid.email,
        firstName:      uid.firstName,
        lastName:       uid.lastName,
        profilePicture: uid.profilePicture,
        status:         uid.status,
      };
    }
  }
}
