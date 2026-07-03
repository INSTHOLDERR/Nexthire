import mongoose, { Schema } from 'mongoose';
import { AppealStatus, AppealType } from '../../../domain/entities/enums';

const appealSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(AppealType), required: true },
    explanation: { type: String, required: true },
    evidence: [{ type: String }],
    status: { type: String, enum: Object.values(AppealStatus), default: AppealStatus.PENDING },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export const AppealModel = mongoose.model('Appeal', appealSchema);
