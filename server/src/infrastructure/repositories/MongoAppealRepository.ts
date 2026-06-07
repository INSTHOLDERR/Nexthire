import { IAppealRepository } from '../../domain/repositories/appeal.repository';
import {
  IAppeal,
  AppealStatus,
  AppealType,
} from '../../domain/entities/appeal.types';

import { AppealModel } from '../database/models/AppealModel';

export class MongoAppealRepository
  implements IAppealRepository
{
  async create(
    data: Partial<IAppeal>
  ): Promise<IAppeal> {
    const appeal = await AppealModel.create(data);

    return {
      _id: appeal._id.toString(),
      userId: appeal.userId,
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    };
  }

  async findById(
    id: string
  ): Promise<IAppeal | null> {
    const appeal = await AppealModel.findById(id)
      .populate(
        'userId',
        'email firstName lastName profilePicture status _id'
      );

    if (!appeal) return null;

    return {
      _id: appeal._id.toString(),
      userId: appeal.userId,
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    };
  }

  async findByUserId(
    userId: string
  ): Promise<IAppeal[]> {
    const appeals = await AppealModel.find({ userId })
      .sort({ createdAt: -1 });

    return appeals.map((appeal) => ({
      _id: appeal._id.toString(),
      userId: appeal.userId,
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    }));
  }

  async findAll(): Promise<IAppeal[]> {
    const appeals = await AppealModel.find()
      .populate(
        'userId',
        'email firstName lastName profilePicture status'
      )
      .sort({ createdAt: -1 });

    return appeals.map((appeal) => ({
      _id: appeal._id.toString(),
      userId: appeal.userId,
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    }));
  }

  async findPending(
    userId: string,
    type: AppealType
  ): Promise<IAppeal | null> {
    const appeal = await AppealModel.findOne({
      userId,
      type,
      status: 'pending',
    });

    if (!appeal) return null;

    return {
      _id: appeal._id.toString(),
      userId: appeal.userId,
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    };
  }

  async updateStatus(
    id: string,
    status: AppealStatus
  ): Promise<IAppeal | null> {
    const appeal =
      await AppealModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

    if (!appeal) return null;

    return {
      _id: appeal._id.toString(),
      userId: appeal.userId,
      type: appeal.type,
      explanation: appeal.explanation,
      evidence: appeal.evidence,
      status: appeal.status,
      adminNote: appeal.adminNote,
      createdAt: appeal.createdAt,
      updatedAt: appeal.updatedAt,
    };
  }
}

export default new MongoAppealRepository();