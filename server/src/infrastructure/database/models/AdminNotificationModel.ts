import mongoose, { Schema } from 'mongoose';
import type { Server } from 'socket.io';

// ─── Admin notifications ──────────────────────────────────────────────────────

const adminNotificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['new_user', 'new_post', 'post_report', 'user_report', 'account_appeal', 'warning_appeal'],
      required: true,
    },
    message: { type: String, required: true, maxlength: 300 },
    refType:  { type: String, enum: ['user', 'post', 'report', 'appeal', 'warning'], default: null },
    refId:    { type: Schema.Types.ObjectId, default: null },
    read:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminNotificationSchema.index({ read: 1, createdAt: -1 });

export const AdminNotificationModel = mongoose.model('AdminNotification', adminNotificationSchema);
export const notifyAdmins = async (
  io: Server | undefined,
  type: 'new_user' | 'new_post' | 'post_report' | 'user_report' | 'account_appeal' | 'warning_appeal',
  message: string,
  ref?: { refType: 'user' | 'post' | 'report' | 'appeal' | 'warning'; refId: string },
): Promise<void> => {
  try {
    const notif = await AdminNotificationModel.create({
      type,
      message: message.slice(0, 300),
      refType: ref?.refType ?? null,
      refId: ref?.refId ?? null,
    });
    io?.to('admin').emit('admin_notification', notif);
  } catch {
  
  }
};
