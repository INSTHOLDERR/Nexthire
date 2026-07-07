import { IPost, IComment, IReport, PostStatus } from '../entities/post.types';

export interface PostFilter {
  requestingUserId: string;
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedPosts {
  posts: IPost[];
  total: number;
  page: number;
  pages: number;
}

export interface PaginatedComments {
  comments: IComment[];
  total: number;
}

export interface PaginatedReports {
  reports: IReport[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface IPostRepository {
  // Posts
  create(data: Partial<IPost>): Promise<IPost>;
  findById(id: string): Promise<IPost | null>;
  findFeed(filter: PostFilter): Promise<PaginatedPosts>;
  findByAuthor(authorId: string): Promise<IPost[]>;
  update(id: string, data: Partial<IPost>): Promise<IPost | null>;
  delete(id: string): Promise<void>;
  toggleLike(postId: string, userId: string): Promise<IPost | null>;
  adminUpdateStatus(postId: string, status: PostStatus, adminNote?: string): Promise<IPost | null>;
  adminFindAll(page: number, limit: number): Promise<PaginatedPosts>;
  incrementCommentCount(postId: string, by: number): Promise<void>;

  // Comments
  createComment(data: Partial<IComment>): Promise<IComment>;
  findCommentById(id: string): Promise<IComment | null>;
  findCommentsByPost(postId: string, parentId: string | null, page: number, limit: number): Promise<PaginatedComments>;
  toggleCommentLike(commentId: string, userId: string): Promise<IComment | null>;
  deleteComment(id: string): Promise<void>;

  // Reports
  createReport(data: Partial<IReport>): Promise<IReport>;
  hasReported(postId: string, userId: string): Promise<boolean>;
  findReportsByPost(postId: string, page: number, limit: number): Promise<PaginatedReports>;
  findAllReports(page: number, limit: number, status?: string): Promise<PaginatedReports>;
  updateReportStatus(reportId: string, status: string, adminNote?: string): Promise<IReport | null>;
  countReportsByPost(postId: string): Promise<number>;
}
