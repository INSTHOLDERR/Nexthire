import { IAppeal } from '../../domain/entities/appeal.types';
import { AppealStatus, AppealType } from '../../domain/entities/enums';


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
