export type PostVisibility = 'public' | 'private';
export type PostStatus = 'active' | 'suspended' | 'removed';

export interface PostMedia {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  publicId: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface IPost {
  _id: string;
  authorId: string;
  title: string;
  description: string;
  media: PostMedia[];
  visibility: PostVisibility;
  status: PostStatus;     
  adminNote?: string;      
  likes: string[];
  commentCount: number;
  shareCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Comment types ──────────────────────────────────────────────────────────

export interface IComment {
  _id: string;
  postId: string;
  authorId: string;
  parentId?: string;       
  text: string;
  likes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Report types ────────────────────────────────────────────────────────────

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface IReport {
  _id: string;
  postId: string;
  reportedBy: string;
  reason: ReportReason;
  description?: string;
  evidenceUrls: string[];
  status: ReportStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}
