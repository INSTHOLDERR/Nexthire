import { IPostRepository } from '../../domain/repositories/post.repository';
import { IUploadService } from '../../domain/services/upload.service';
import { AppError } from '../../shared/errors/AppError';
import { ErrorCode } from '../../shared/errors/error-codes';
import { UseCase } from '../UseCase';
import { PostResponseDTO, PaginatedPostsDTO, CommentResponseDTO, ReportResponseDTO } from '../dto/post.dto';
import { PostMedia } from '../../domain/entities/post.types';
import { NotificationModel } from '../../infrastructure/database/models/SocialModels';
import mongoose from 'mongoose';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME: Record<string, 'image' | 'video' | 'audio' | 'document'> = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
  'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video', 'video/x-msvideo': 'video',
  'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/ogg': 'audio', 'audio/mp4': 'audio', 'audio/aac': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'text/plain': 'document',
};

async function uploadFiles(files: Express.Multer.File[], uploadService: IUploadService): Promise<PostMedia[]> {
  const media: PostMedia[] = [];
  for (const file of files ?? []) {
    const mediaType = ALLOWED_MIME[file.mimetype] ?? 'document';
    const folder = `nexthire/posts/${mediaType}s`;
    const resourceType = (mediaType === 'video' || mediaType === 'audio') ? 'video' : mediaType === 'document' ? 'raw' : 'image';
    try {
      const result = await uploadService.uploadMedia(file.buffer, folder, resourceType as any);
      media.push({
        url: result.url, publicId: result.publicId, type: mediaType,
        originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
      });
    } catch (err) {
      console.warn('⚠️ Post media upload failed:', (err as Error).message);
    }
  }
  return media;
}

// ─── CreatePostUseCase ───────────────────────────────────────────────────────

interface CreatePostInput {
  authorId: string;
  title: string;
  description: string;
  visibility: 'public' | 'private';
  files: Express.Multer.File[];
}

export class CreatePostUseCase extends UseCase<CreatePostInput, PostResponseDTO> {
  constructor(private readonly postRepo: IPostRepository, private readonly uploadService: IUploadService) { super(); }

  async execute({ authorId, title, description, visibility, files }: CreatePostInput): Promise<PostResponseDTO> {
    if (!title.trim())       throw AppError.badRequest('Title is required.', ErrorCode.VALIDATION_ERROR);
    if (!description.trim()) throw AppError.badRequest('Description is required.', ErrorCode.VALIDATION_ERROR);

    const media = await uploadFiles(files, this.uploadService);
    const post = await this.postRepo.create({ authorId, title: title.trim(), description: description.trim(), media, visibility, status: 'active' });
    const populated = await this.postRepo.findById(post._id);
    return new PostResponseDTO(populated ?? post, authorId);
  }
}

// ─── EditPostUseCase ─────────────────────────────────────────────────────────

interface EditPostInput {
  postId: string;
  requestingUserId: string;
  title?: string;
  description?: string;
  visibility?: 'public' | 'private';
  keepMediaIds?: string[];    // publicIds of existing media to keep
  files: Express.Multer.File[];
}

export class EditPostUseCase extends UseCase<EditPostInput, PostResponseDTO> {
  constructor(private readonly postRepo: IPostRepository, private readonly uploadService: IUploadService) { super(); }

  async execute({ postId, requestingUserId, title, description, visibility, keepMediaIds, files }: EditPostInput): Promise<PostResponseDTO> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);
    const authorId = typeof post.authorId === 'string' ? post.authorId : (post.authorId as any)._id?.toString();
    if (authorId !== requestingUserId) throw AppError.forbidden('You can only edit your own posts.', ErrorCode.UNAUTHORIZED);
    if (post.status === 'suspended') throw AppError.forbidden('Cannot edit a suspended post.', ErrorCode.VALIDATION_ERROR);

    // Keep only media the user wants to retain
    const keepSet = new Set(keepMediaIds ?? post.media.map(m => m.publicId));
    const keptMedia = post.media.filter(m => keepSet.has(m.publicId));
    const newMedia = await uploadFiles(files, this.uploadService);

    const update: any = { media: [...keptMedia, ...newMedia] };
    if (title)       update.title = title.trim();
    if (description) update.description = description.trim();
    if (visibility)  update.visibility = visibility;

    const updated = await this.postRepo.update(postId, update);
    const populated = await this.postRepo.findById(postId);
    return new PostResponseDTO(populated ?? updated!, requestingUserId);
  }
}

// ─── GetFeedUseCase ──────────────────────────────────────────────────────────

interface GetFeedInput { requestingUserId: string; page?: number; limit?: number; search?: string }

export class GetFeedUseCase extends UseCase<GetFeedInput, PaginatedPostsDTO> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ requestingUserId, page = 1, limit = 10, search }: GetFeedInput): Promise<PaginatedPostsDTO> {
    const result = await this.postRepo.findFeed({ requestingUserId, page, limit, search });
    return new PaginatedPostsDTO(result, requestingUserId);
  }
}

// ─── DeletePostUseCase ───────────────────────────────────────────────────────

interface DeletePostInput { postId: string; requestingUserId: string }

export class DeletePostUseCase extends UseCase<DeletePostInput, { deleted: true }> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ postId, requestingUserId }: DeletePostInput): Promise<{ deleted: true }> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);
    const authorId = typeof post.authorId === 'string' ? post.authorId : (post.authorId as any)._id?.toString();
    if (authorId !== requestingUserId) throw AppError.forbidden('You can only delete your own posts.', ErrorCode.UNAUTHORIZED);
    await this.postRepo.delete(postId);
    return { deleted: true };
  }
}

// ─── ToggleLikeUseCase ───────────────────────────────────────────────────────

interface ToggleLikeInput { postId: string; userId: string }

export class ToggleLikeUseCase extends UseCase<ToggleLikeInput, PostResponseDTO> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ postId, userId }: ToggleLikeInput): Promise<PostResponseDTO> {
    const post = await this.postRepo.toggleLike(postId, userId);
    if (!post) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);
    const populated = await this.postRepo.findById(post._id);
    const dto = new PostResponseDTO(populated ?? post, userId);
    // Notify post author (skip if liking own post or if they unliked) — wrapped so notification
    // failures never kill the like toggle itself
    try {
      const authorId2 = dto.author.id;
      if (authorId2 && authorId2 !== userId && dto.likedByMe) {
        await NotificationModel.create({
          userId:   new mongoose.Types.ObjectId(authorId2),
          fromUser: new mongoose.Types.ObjectId(userId),
          type:     'post_liked',
          postId:   new mongoose.Types.ObjectId(postId),
          message:  'liked your post.',
        });
      }
    } catch (notifErr) {
      console.warn('[ToggleLike] Notification failed (non-fatal):', (notifErr as Error).message);
    }
    return dto;
  }
}

// ─── CreateCommentUseCase ────────────────────────────────────────────────────

interface CreateCommentInput {
  postId: string;
  authorId: string;
  text: string;
  parentId?: string;
}

export class CreateCommentUseCase extends UseCase<CreateCommentInput, CommentResponseDTO> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ postId, authorId, text, parentId }: CreateCommentInput): Promise<CommentResponseDTO> {
    if (!text.trim()) throw AppError.badRequest('Comment text is required.', ErrorCode.VALIDATION_ERROR);
    const post = await this.postRepo.findById(postId);
    if (!post) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);

    if (parentId) {
      const parent = await this.postRepo.findCommentById(parentId);
      if (!parent) throw AppError.notFound('Parent comment not found.', ErrorCode.NOT_FOUND);
    }

    const comment = await this.postRepo.createComment({ postId, authorId, text: text.trim(), parentId: parentId ?? undefined });
    await this.postRepo.incrementCommentCount(postId, 1);
    const dto = new CommentResponseDTO(comment, authorId);
    // Notify post author (skip if commenting on own post) — wrapped so notification
    // failures never kill the comment creation itself
    try {
      const populated2 = await this.postRepo.findById(postId);
      const postAuthorStr = populated2?.authorId ? String((populated2.authorId as any)._id ?? populated2.authorId) : null;
      if (postAuthorStr && postAuthorStr !== authorId) {
        const notifType = parentId ? 'comment_replied' : 'post_commented';
        await NotificationModel.create({
          userId:   new mongoose.Types.ObjectId(postAuthorStr),
          fromUser: new mongoose.Types.ObjectId(authorId),
          type:     notifType,
          postId:   new mongoose.Types.ObjectId(postId),
          message:  parentId ? 'replied to a comment on your post.' : 'commented on your post.',
        });
      }
    } catch (notifErr) {
      console.warn('[CreateComment] Notification failed (non-fatal):', (notifErr as Error).message);
    }
    return dto;
  }
}

// ─── GetCommentsUseCase ──────────────────────────────────────────────────────

interface GetCommentsInput {
  postId: string;
  parentId: string | null;
  page?: number;
  limit?: number;
  requestingUserId: string;
}

export class GetCommentsUseCase extends UseCase<GetCommentsInput, { comments: CommentResponseDTO[]; total: number }> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ postId, parentId, page = 1, limit = 20, requestingUserId }: GetCommentsInput) {
    const result = await this.postRepo.findCommentsByPost(postId, parentId, page, limit);
    return {
      comments: result.comments.map(c => new CommentResponseDTO(c, requestingUserId)),
      total: result.total,
    };
  }
}

// ─── ToggleCommentLikeUseCase ────────────────────────────────────────────────

interface ToggleCommentLikeInput { commentId: string; userId: string }

export class ToggleCommentLikeUseCase extends UseCase<ToggleCommentLikeInput, CommentResponseDTO> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ commentId, userId }: ToggleCommentLikeInput): Promise<CommentResponseDTO> {
    const comment = await this.postRepo.toggleCommentLike(commentId, userId);
    if (!comment) throw AppError.notFound('Comment not found.', ErrorCode.NOT_FOUND);
    return new CommentResponseDTO(comment, userId);
  }
}

// ─── DeleteCommentUseCase ────────────────────────────────────────────────────

interface DeleteCommentInput { commentId: string; requestingUserId: string }

export class DeleteCommentUseCase extends UseCase<DeleteCommentInput, { deleted: true }> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ commentId, requestingUserId }: DeleteCommentInput): Promise<{ deleted: true }> {
    const comment = await this.postRepo.findCommentById(commentId);
    if (!comment) throw AppError.notFound('Comment not found.', ErrorCode.NOT_FOUND);
    const authorId = typeof comment.authorId === 'string' ? comment.authorId : (comment.authorId as any)?._id?.toString();
    if (authorId !== requestingUserId) throw AppError.forbidden('You can only delete your own comments.', ErrorCode.UNAUTHORIZED);
    await this.postRepo.deleteComment(commentId);
    await this.postRepo.incrementCommentCount(comment.postId, -1);
    return { deleted: true };
  }
}

// ─── ReportPostUseCase ───────────────────────────────────────────────────────

interface ReportPostInput {
  postId: string;
  reportedBy: string;
  reason: string;
  description?: string;
  evidenceFiles: Express.Multer.File[];
}

export class ReportPostUseCase extends UseCase<ReportPostInput, ReportResponseDTO> {
  constructor(private readonly postRepo: IPostRepository, private readonly uploadService: IUploadService) { super(); }

  async execute({ postId, reportedBy, reason, description, evidenceFiles }: ReportPostInput): Promise<ReportResponseDTO> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);

    const alreadyReported = await this.postRepo.hasReported(postId, reportedBy);
    if (alreadyReported) throw AppError.conflict('You have already reported this post.', ErrorCode.VALIDATION_ERROR);

    const evidenceUrls: string[] = [];
    for (const file of evidenceFiles ?? []) {
      try {
        const result = await this.uploadService.uploadImage(file.buffer, 'nexthire/reports');
        evidenceUrls.push(result);
      } catch { /* skip failed evidence uploads */ }
    }

    const report = await this.postRepo.createReport({ postId, reportedBy, reason: reason as any, description, evidenceUrls });
    return new ReportResponseDTO(report);
  }
}

// ─── GetPostReportsUseCase ───────────────────────────────────────────────────

interface GetPostReportsInput { postId: string; requestingUserId: string; page?: number; limit?: number }

export class GetPostReportsUseCase extends UseCase<GetPostReportsInput, any> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ postId, requestingUserId, page = 1, limit = 20 }: GetPostReportsInput) {
    const post = await this.postRepo.findById(postId);
    if (!post) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);
    // Only the post author or admin can view reports
    const authorId = typeof post.authorId === 'string' ? post.authorId : (post.authorId as any)?._id?.toString();
    if (authorId !== requestingUserId) throw AppError.forbidden('Not authorized.', ErrorCode.UNAUTHORIZED);
    return this.postRepo.findReportsByPost(postId, page, limit);
  }
}

// ─── Admin: GetAllPostsUseCase ───────────────────────────────────────────────

interface AdminGetPostsInput { page?: number; limit?: number }

export class AdminGetPostsUseCase extends UseCase<AdminGetPostsInput, any> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ page = 1, limit = 20 }: AdminGetPostsInput) {
    const result = await this.postRepo.adminFindAll(page, limit);
    const postsWithReportCount = await Promise.all(
      result.posts.map(async post => {
        const reportCount = await this.postRepo.countReportsByPost(post._id);
        return new PostResponseDTO(post, undefined, reportCount);
      })
    );
    return { ...result, posts: postsWithReportCount };
  }
}

// ─── Admin: UpdatePostStatusUseCase ─────────────────────────────────────────

interface AdminUpdatePostStatusInput {
  postId: string;
  status: 'active' | 'suspended' | 'removed';
  adminNote?: string;
}

export class AdminUpdatePostStatusUseCase extends UseCase<AdminUpdatePostStatusInput, PostResponseDTO> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ postId, status, adminNote }: AdminUpdatePostStatusInput): Promise<PostResponseDTO> {
    const updated = await this.postRepo.adminUpdateStatus(postId, status, adminNote);
    if (!updated) throw AppError.notFound('Post not found.', ErrorCode.NOT_FOUND);
    const populated = await this.postRepo.findById(postId);
    return new PostResponseDTO(populated ?? updated);
  }
}

// ─── Admin: GetAllReportsUseCase ─────────────────────────────────────────────

interface AdminGetReportsInput { page?: number; limit?: number; status?: string }

export class AdminGetReportsUseCase extends UseCase<AdminGetReportsInput, any> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ page = 1, limit = 20, status }: AdminGetReportsInput) {
    return this.postRepo.findAllReports(page, limit, status);
  }
}

// ─── Admin: ReviewReportUseCase ──────────────────────────────────────────────

interface AdminReviewReportInput { reportId: string; status: 'reviewed' | 'resolved'; adminNote?: string }

export class AdminReviewReportUseCase extends UseCase<AdminReviewReportInput, ReportResponseDTO> {
  constructor(private readonly postRepo: IPostRepository) { super(); }

  async execute({ reportId, status, adminNote }: AdminReviewReportInput): Promise<ReportResponseDTO> {
    const report = await this.postRepo.updateReportStatus(reportId, status, adminNote);
    if (!report) throw AppError.notFound('Report not found.', ErrorCode.NOT_FOUND);
    return new ReportResponseDTO(report);
  }
}
