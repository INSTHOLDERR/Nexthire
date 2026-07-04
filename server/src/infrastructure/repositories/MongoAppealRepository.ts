import { IAppealRepository, AppealFilter, PaginatedAppeals } from '../../domain/repositories/appeal.repository';
import { IAppeal, AppealStatus, AppealType } from '../../domain/entities/appeal.types';
import { AppealModel } from '../database/models/AppealModel';
import { BaseRepository } from './BaseRepository';

export class MongoAppealRepository extends BaseRepository<IAppeal> implements IAppealRepository {
  protected mapToEntity(appeal: any): IAppeal {
    return {
      _id: appeal._id.toString(),
      userId: appeal.userId as IAppeal['userId'],
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    };
  }

  async create(data: Partial<IAppeal>): Promise<IAppeal> {
    const appeal = await AppealModel.create(data);
    return this.mapToEntity(appeal);
  }

  async findById(id: string): Promise<IAppeal | null> {
    const appeal = await AppealModel.findById(id).populate(
      'userId',
      'email firstName lastName profilePicture status _id'
    );
    return appeal ? this.mapToEntity(appeal) : null;
  }

  async findByUserId(userId: string): Promise<IAppeal[]> {
    const appeals = await AppealModel.find({ userId }).sort({ createdAt: -1 });
    return appeals.map((a) => this.mapToEntity(a));
  }

  async findAll({ status, type, page, limit }: AppealFilter): Promise<PaginatedAppeals> {
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (type)   query.type   = type;

    const total   = await AppealModel.countDocuments(query);
    const appeals = await AppealModel.find(query)
      .populate('userId', 'email firstName lastName profilePicture status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      appeals: appeals.map((a) => this.mapToEntity(a)),
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    };
  }

  async findPending(userId: string, type: AppealType): Promise<IAppeal | null> {
    const appeal = await AppealModel.findOne({ userId, type, status: AppealStatus.PENDING });
    return appeal ? this.mapToEntity(appeal) : null;
  }

  async updateStatus(id: string, status: AppealStatus): Promise<IAppeal | null> {
    const appeal = await AppealModel.findByIdAndUpdate(id, { status }, { new: true })
      .populate('userId', 'email firstName lastName profilePicture status');
    return appeal ? this.mapToEntity(appeal) : null;
  }
}

export default new MongoAppealRepository();
