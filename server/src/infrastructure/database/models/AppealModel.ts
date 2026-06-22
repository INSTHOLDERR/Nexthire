import mongoose, { Schema } from 'mongoose';

const appealSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['suspension', 'ban'], required: true },
    explanation: { type: String, required: true },
    evidence: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export const AppealModel = mongoose.model('Appeal', appealSchema);
