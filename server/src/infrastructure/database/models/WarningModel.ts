import mongoose, { Schema } from 'mongoose';

// ─── Warning ──────────────────────────────────────────────────────────────────
// Issued by an admin against a user, usually while reviewing a report.
// The user sees their warnings and may appeal each one once. If the appeal is
// approved, the warning is revoked. Repeated active warnings justify
// escalation (suspend post / suspend user / ban) at the admin's discretion.

const warningSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },  // who is warned
    reportId:  { type: Schema.Types.ObjectId, ref: 'Report', default: null }, // originating report, if any
    postId:    { type: Schema.Types.ObjectId, ref: 'Post', default: null },   // related post, if any
    reason:    { type: String, required: true, maxlength: 200 },
    note:      { type: String, default: '', maxlength: 2000 },                // admin explanation shown to user
    issuedBy:  { type: String, default: 'admin' },
    status:    { type: String, enum: ['active', 'appealed', 'revoked'], default: 'active' },

    // Appeal (one per warning)
    appealText:      { type: String, default: '' },
    appealStatus:    { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    appealAdminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

warningSchema.index({ userId: 1, status: 1, createdAt: -1 });
warningSchema.index({ appealStatus: 1, createdAt: -1 });

export const WarningModel = mongoose.model('Warning', warningSchema);
