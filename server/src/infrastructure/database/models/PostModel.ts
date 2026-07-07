import mongoose, { Schema } from 'mongoose';

// ─── Post ────────────────────────────────────────────────────────────────────

const postMediaSchema = new Schema({
  url:          { type: String, required: true },
  type:         { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
  publicId:     { type: String, required: true },
  originalName: { type: String },
  mimeType:     { type: String },
  sizeBytes:    { type: Number },
}, { _id: false });

const postSchema = new Schema(
  {
    authorId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    media:       [postMediaSchema],
    visibility:  { type: String, enum: ['public', 'private'], default: 'public' },
    status:      { type: String, enum: ['active', 'suspended', 'removed'], default: 'active' },
    adminNote:   { type: String, default: null },
    likes:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentCount:{ type: Number, default: 0 },
    shareCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ visibility: 1, status: 1, createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });

export const PostModel = mongoose.model('Post', postSchema);

// ─── Comment ─────────────────────────────────────────────────────────────────

const commentSchema = new Schema(
  {
    postId:   { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    text:     { type: String, required: true, maxlength: 2000 },
    likes:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

export const CommentModel = mongoose.model('Comment', commentSchema);

// ─── Report ──────────────────────────────────────────────────────────────────

const reportSchema = new Schema(
  {
    // What is being reported — a post or a user
    targetType:   { type: String, enum: ['post', 'user'], default: 'post' },
    postId:       { type: Schema.Types.ObjectId, ref: 'Post', default: null },   // required when targetType === 'post'
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },   // required when targetType === 'user'
    reportedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason:       { type: String, enum: ['spam','harassment','misinformation','inappropriate','copyright','other'], required: true },
    description:  { type: String, maxlength: 2000 },
    evidenceUrls: [{ type: String }],
    status:       { type: String, enum: ['pending','reviewed','resolved'], default: 'pending' },
    adminNote:    { type: String },

    // The reported user's / post owner's side of the story (defence).
    // Admins see it next to the report before taking action.
    targetResponse:    { type: String, default: '', maxlength: 2000 },
    targetRespondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ postId: 1, createdAt: -1 });
reportSchema.index({ targetUserId: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const ReportModel = mongoose.model('Report', reportSchema);
