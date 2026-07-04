import { IAppeal, AppealStatus, AppealType } from '../entities/appeal.types';

export interface AppealFilter {
  status?: AppealStatus;
  type?: AppealType;
  page: number;
  limit: number;
}

export interface PaginatedAppeals {
  appeals: IAppeal[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface IAppealRepository {
  create(data: Partial<IAppeal>): Promise<IAppeal>;
  findById(id: string): Promise<IAppeal | null>;
  findByUserId(userId: string): Promise<IAppeal[]>;
  findAll(filter: AppealFilter): Promise<PaginatedAppeals>;
  findPending(userId: string, type: AppealType): Promise<IAppeal | null>;
  updateStatus(id: string, status: AppealStatus): Promise<IAppeal | null>;
}
