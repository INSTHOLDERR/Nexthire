import {
  IAppeal,
  AppealStatus,
  AppealType,
} from "../entities/appeal.types";

export interface IAppealRepository {
  create(data: Partial<IAppeal>): Promise<IAppeal>;
  findById(id: string): Promise<IAppeal | null>;
  findByUserId(userId: string): Promise<IAppeal[]>;
  findAll(): Promise<IAppeal[]>;
  findPending(
    userId: string,
    type: AppealType
  ): Promise<IAppeal | null>;

  updateStatus(
    id: string,
    status: AppealStatus
  ): Promise<IAppeal | null>;
}