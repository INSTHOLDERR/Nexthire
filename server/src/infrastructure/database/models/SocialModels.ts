import mongoose, { Schema } from 'mongoose';

// ─── Notification ─────────────────────────────────────────────────────────────

const notificationSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true }, // who receives this
    fromUser:  { type: Schema.Types.ObjectId, ref: 'User', default: null },  // who caused it
    type:      {
      type: String,
      enum: [
        'connection_request',   // someone sent you a connection request
        'connection_accepted',  // someone accepted your request
        'post_liked',           // someone liked your post
        'post_commented',       // someone commented on your post
        'comment_liked',        // someone liked your comment
        'comment_replied',      // someone replied to your comment
        'message',              // new message in a conversation
        'post_suspended',       // admin suspended your post
        'admin_note',           // admin sent you a note
        'group_invite',         // someone invited you to a group
        'group_update',         // group membership/role changes
        'warning',              // admin issued you a warning
      ],
      required: true,
    },
    postId:    { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    commentId: { type: Schema.Types.ObjectId, default: null },
    message:   { type: String, default: '' },  // short human-readable text
    read:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
export const NotificationModel = mongoose.model('Notification', notificationSchema);

// ─── Conversation ─────────────────────────────────────────────────────────────
// Only exists between two connected users. One user sends a request, the other
// approves — only then can they exchange messages.

const conversationSchema = new Schema(
  {
    participants:  [{ type: Schema.Types.ObjectId, ref: 'User', required: true }], // 2 for direct, N for groups
    status:        { type: String, enum: ['pending', 'active', 'ignored'], default: 'pending' },
    requestedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true }, // who initiated / created

    // ── Group chat fields ──
    isGroup:        { type: Boolean, default: false },
    name:           { type: String, default: '', maxlength: 100 },      // group name
    avatar:         { type: String, default: '' },                      // group avatar url
    avatarPublicId: { type: String, default: '' },
    admins:         [{ type: Schema.Types.ObjectId, ref: 'User' }],     // group moderators
    pendingMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],     // invited, not yet accepted
    lastMessage:   { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    unreadCount:   { type: Map, of: Number, default: {} }, // userId → unread count
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ status: 1, lastMessageAt: -1 });
export const ConversationModel = mongoose.model('Conversation', conversationSchema);

// ─── Message ──────────────────────────────────────────────────────────────────

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:           { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'system'], default: 'text' },
    text:           { type: String, default: '', maxlength: 5000 }, // caption for media, body for text/system
    media:          {
      url:          { type: String },
      publicId:     { type: String },
      originalName: { type: String },
      mimeType:     { type: String },
      sizeBytes:    { type: Number },
    },
    read:           { type: Boolean, default: false },
    readBy:         [{ type: Schema.Types.ObjectId, ref: 'User' }], // for groups
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
export const MessageModel = mongoose.model('Message', messageSchema);
