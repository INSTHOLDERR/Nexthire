import mongoose, { Schema } from 'mongoose';

// ─── Warning ──────────────────────────────────────────────────────────────────


const warningSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    reportId:  { type: Schema.Types.ObjectId, ref: 'Report', default: null }, 
    postId:    { type: Schema.Types.ObjectId, ref: 'Post', default: null },   
    reason:    { type: String, required: true, maxlength: 200 },
    note:      { type: String, default: '', maxlength: 2000 },              
    issuedBy:  { type: String, default: 'admin' },
    status:    { type: String, enum: ['active', 'appealed', 'revoked'], default: 'active' },
    appealText:      { type: String, default: '' },
    appealStatus:    { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    appealAdminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

warningSchema.index({ userId: 1, status: 1, createdAt: -1 });
warningSchema.index({ appealStatus: 1, createdAt: -1 });

export const WarningModel = mongoose.model('Warning', warningSchema);
