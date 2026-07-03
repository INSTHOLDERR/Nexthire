import { IUser } from './user.types';
import { AppealStatus, AppealType } from './enums';

export { AppealStatus, AppealType };

export interface IAppeal {
  _id: string;
  userId: string | IUser;
  type: AppealType;
  explanation: string;
  evidence: string[];
  status: AppealStatus;
  adminNote: string;
  createdAt: Date;
  updatedAt: Date;
}
