import mongoose, { Schema } from 'mongoose';

// ─── Notification ─────────────────────────────────────────────────────────────

const notificationSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromUser:  { type: Schema.Types.ObjectId, ref: 'User', default: null }, 
    type:      {
      type: String,
      enum: [
        'connection_request',  
        'connection_accepted', 
        'post_liked',        
        'post_commented',    
        'comment_liked',        
        'comment_replied',     
        'message',              
        'post_suspended',      
        'admin_note',         
        'group_invite',         
        'group_update',      
        'warning',              
      ],
      required: true,
    },
    postId:    { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    commentId: { type: Schema.Types.ObjectId, default: null },
    message:   { type: String, default: '' },  
    read:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
export const NotificationModel = mongoose.model('Notification', notificationSchema);

// ─── Conversation ─────────────────────────────────────────────────────────────


const conversationSchema = new Schema(
  {
    participants:  [{ type: Schema.Types.ObjectId, ref: 'User', required: true }], 
    status:        { type: String, enum: ['pending', 'active', 'ignored'], default: 'pending' },
    requestedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    isGroup:        { type: Boolean, default: false },
    name:           { type: String, default: '', maxlength: 100 },    
    avatar:         { type: String, default: '' },                      
    avatarPublicId: { type: String, default: '' },
    admins:         [{ type: Schema.Types.ObjectId, ref: 'User' }],  
    pendingMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],     
    lastMessage:   { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    unreadCount:   { type: Map, of: Number, default: {} }, 
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
    text:           { type: String, default: '', maxlength: 5000 }, 
    media:          {
      url:          { type: String },
      publicId:     { type: String },
      originalName: { type: String },
      mimeType:     { type: String },
      sizeBytes:    { type: Number },
    },
    read:           { type: Boolean, default: false },
    readBy:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
export const MessageModel = mongoose.model('Message', messageSchema);
