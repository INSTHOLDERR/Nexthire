import api from './api';

export interface PostMedia {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  publicId: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface PostAuthor {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  headline?: string;
  role?: string;
  workStatus?: string;
}

export interface Post {
  id: string;
  title: string;
  description: string;
  media: PostMedia[];
  visibility: 'public' | 'private';
  status: 'active' | 'suspended' | 'removed';
  adminNote?: string;
  likesCount: number;
  likedByMe: boolean;
  commentCount: number;
  sharesCount?: number;
  reportCount?: number;
  createdAt: string;
  author: PostAuthor;
}

export interface PostLiker { _id: string; firstName?: string; lastName?: string; profilePicture?: string; headline?: string }


export interface Comment {
  id: string;
  postId: string;
  parentId?: string;
  text: string;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
}

export interface Report {
  id: string;
  postId: string;
  reportedBy: { id: string; firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  reason: string;
  description?: string;
  evidenceUrls: string[];
  status: 'pending' | 'reviewed' | 'resolved';
  adminNote?: string;
  createdAt: string;
}

export interface PaginatedPosts  { posts: Post[];    total: number; page: number; pages: number; }
export interface PaginatedReports{ reports: Report[]; total: number; page: number; pages: number; limit: number; }

// ── Posts ─────────────────────────────────────────────────────────────────────
export const getFeed       = (page = 1, limit = 10, search = '') => api.get<{ success: boolean; data: PaginatedPosts }>('/posts', { params: { page, limit, ...(search ? { search } : {}) } });
export const createPost    = (formData: FormData)           => api.post<{ success: boolean; data: Post }>('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const editPost      = (postId: string, fd: FormData) => api.patch<{ success: boolean; data: Post }>(`/posts/${postId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deletePost    = (postId: string)               => api.delete(`/posts/${postId}`);
export const toggleLike    = (postId: string)               => api.post<{ success: boolean; data: Post }>(`/posts/${postId}/like`);

// ── Comments ──────────────────────────────────────────────────────────────────
export const getComments   = (postId: string, params?: { parentId?: string; page?: number; limit?: number }) => api.get<{ success: boolean; data: { comments: Comment[]; total: number } }>(`/posts/${postId}/comments`, { params });
export const createComment = (postId: string, body: { text: string; parentId?: string })                    => api.post<{ success: boolean; data: Comment }>(`/posts/${postId}/comments`, body);
export const likeComment   = (commentId: string)            => api.post<{ success: boolean; data: Comment }>(`/posts/comments/${commentId}/like`);
export const deleteComment = (commentId: string)            => api.delete(`/posts/comments/${commentId}`);

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportPost    = (postId: string, fd: FormData) => api.post(`/posts/${postId}/report`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getPostReports= (postId: string, params?: { page?: number; limit?: number }) => api.get<{ success: boolean; data: PaginatedReports }>(`/posts/${postId}/reports`, { params });

// ── Misc ──────────────────────────────────────────────────────────────────────
export const setWorkStatus = (workStatus: string) => api.patch('/profile/work-status', { workStatus });

// ── Likes / shares / single post ─────────────────────────────────────────────
export const getSinglePost = (postId: string) => api.get(`/posts/single/${postId}`);
export const getPostLikes  = (postId: string, page = 1) => api.get(`/posts/${postId}/likes`, { params: { page } });
export const sharePost     = (postId: string) => api.post(`/posts/${postId}/share`);
