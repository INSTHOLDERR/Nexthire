import { IUser } from "./user.types";

export type AppealStatus = "pending" | "approved" | "rejected";
export type AppealType = "suspension" | "ban";

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