import { Request, Response, NextFunction } from 'express';
import {
  CreatePostUseCase, EditPostUseCase, GetFeedUseCase, DeletePostUseCase, ToggleLikeUseCase,
  CreateCommentUseCase, GetCommentsUseCase, ToggleCommentLikeUseCase, DeleteCommentUseCase,
  ReportPostUseCase, GetPostReportsUseCase,
  AdminGetPostsUseCase, AdminUpdatePostStatusUseCase, AdminGetReportsUseCase, AdminReviewReportUseCase,
} from '../../../use-cases/post/PostUseCases';
import postRepo from '../../../infrastructure/repositories/MongoPostRepository';
import uploadService from '../../../infrastructure/services/CloudinaryService';
import { AppError } from '../../../shared/errors/AppError';
import { ErrorCode } from '../../../shared/errors/error-codes';

// ── Instances ────────────────────────────────────────────────────────────────

const createPostUseCase      = new CreatePostUseCase(postRepo, uploadService);
const editPostUseCase        = new EditPostUseCase(postRepo, uploadService);
const getFeedUseCase         = new GetFeedUseCase(postRepo);
const deletePostUseCase      = new DeletePostUseCase(postRepo);
const toggleLikeUseCase      = new ToggleLikeUseCase(postRepo);
const createCommentUseCase   = new CreateCommentUseCase(postRepo);
const getCommentsUseCase     = new GetCommentsUseCase(postRepo);
const toggleCommentLike      = new ToggleCommentLikeUseCase(postRepo);
const deleteCommentUseCase   = new DeleteCommentUseCase(postRepo);
const reportPostUseCase      = new ReportPostUseCase(postRepo, uploadService);
const getPostReportsUseCase  = new GetPostReportsUseCase(postRepo);
const adminGetPostsUseCase   = new AdminGetPostsUseCase(postRepo);
const adminUpdateStatusUseCase = new AdminUpdatePostStatusUseCase(postRepo);
const adminGetReportsUseCase = new AdminGetReportsUseCase(postRepo);
const adminReviewReportUseCase = new AdminReviewReportUseCase(postRepo);

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const uid = (req: Request) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated.', ErrorCode.UNAUTHORIZED);
  return req.user.id;
};

// ── User: Posts ───────────────────────────────────────────────────────────────

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, visibility } = req.body;
    const post = await createPostUseCase.execute({
      authorId: uid(req), title, description,
      visibility: visibility === 'private' ? 'private' : 'public',
      files: (req.files as Express.Multer.File[]) ?? [],
    });
    req.app.locals.io?.to('feed').emit('new_post', post);
    {
      const { notifyAdmins } = await import('../../../infrastructure/database/models/AdminNotificationModel');
      const a = (post as any).author;
      const authorName = a?.firstName ? `${a.firstName} ${a.lastName ?? ''}`.trim() : 'A user';
      notifyAdmins(req.app.locals.io, 'new_post', `📝 New post by ${authorName}: "${(post as any).title}"`, { refType: 'post', refId: String((post as any).id ?? (post as any)._id) });
    }
    return ok(res, post, 201);
  } catch (err) { next(err); }
};

export const editPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, visibility, keepMediaIds } = req.body;
    const post = await editPostUseCase.execute({
      postId: req.params.postId, requestingUserId: uid(req),
      title, description, visibility,
      keepMediaIds: keepMediaIds ? JSON.parse(keepMediaIds) : undefined,
      files: (req.files as Express.Multer.File[]) ?? [],
    });
    return ok(res, post);
  } catch (err) { next(err); }
};

export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search } = req.query as Record<string, string>;
    const feed = await getFeedUseCase.execute({
      requestingUserId: uid(req),
      page: page ? Number(page) : 1, limit: limit ? Number(limit) : 10,
      search: search || undefined,
    });
    return ok(res, feed);
  } catch (err) { next(err); }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deletePostUseCase.execute({ postId: req.params.postId, requestingUserId: uid(req) });
    return ok(res, result);
  } catch (err) { next(err); }
};

export const toggleLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await toggleLikeUseCase.execute({ postId: req.params.postId, userId: uid(req) });
    return ok(res, post);
  } catch (err) { next(err); }
};

// ── User: Comments ────────────────────────────────────────────────────────────

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await createCommentUseCase.execute({
      postId: req.params.postId, authorId: uid(req),
      text: req.body.text, parentId: req.body.parentId,
    });
    return ok(res, comment, 201);
  } catch (err) { next(err); }
};

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentId, page, limit } = req.query as Record<string, string>;
    const result = await getCommentsUseCase.execute({
      postId: req.params.postId,
      parentId: parentId || null,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      requestingUserId: uid(req),
    });
    return ok(res, result);
  } catch (err) { next(err); }
};

export const likeComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await toggleCommentLike.execute({ commentId: req.params.commentId, userId: uid(req) });
    return ok(res, comment);
  } catch (err) { next(err); }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await deleteCommentUseCase.execute({ commentId: req.params.commentId, requestingUserId: uid(req) });
    return ok(res, result);
  } catch (err) { next(err); }
};

// ── User: Reports ─────────────────────────────────────────────────────────────

export const reportPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportPostUseCase.execute({
      postId: req.params.postId, reportedBy: uid(req),
      reason: req.body.reason, description: req.body.description,
      evidenceFiles: (req.files as Express.Multer.File[]) ?? [],
    });

    // Admin activity feed: a post was reported
    {
      const { notifyAdmins } = await import('../../../infrastructure/database/models/AdminNotificationModel');
      const { PostModel: PM } = await import('../../../infrastructure/database/models/PostModel');
      const reported: any = await PM.findById(req.params.postId).select('title');
      notifyAdmins(req.app.locals.io, 'post_report', `🚩 Post reported (${req.body.reason}): "${reported?.title ?? 'a post'}"`, { refType: 'post', refId: req.params.postId });
    }


    try {
      const { PostModel } = await import('../../../infrastructure/database/models/PostModel');
      const { NotificationModel } = await import('../../../infrastructure/database/models/SocialModels');
      const post: any = await PostModel.findById(req.params.postId).select('authorId title');
      if (post && String(post.authorId) !== uid(req)) {
        const n = await NotificationModel.create({
          userId: post.authorId, type: 'admin_note', postId: post._id,
          message: `Your post "${post.title}" received a report. You can view it and add your response in Reports → Against me.`,
        });
        req.app.locals.io?.to(`user:${post.authorId}`).emit('notification', n);
      }
    } catch { /* notification is best-effort */ }

    return ok(res, report, 201);
  } catch (err) { next(err); }
};

export const getPostReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await getPostReportsUseCase.execute({
      postId: req.params.postId, requestingUserId: uid(req),
      page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20,
    });
    return ok(res, result);
  } catch (err) { next(err); }
};

// ── Admin: Posts ──────────────────────────────────────────────────────────────

export const adminGetPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const result = await adminGetPostsUseCase.execute({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20 });
    return ok(res, result);
  } catch (err) { next(err); }
};

export const adminUpdatePostStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminNote } = req.body;
    const post = await adminUpdateStatusUseCase.execute({ postId: req.params.postId, status, adminNote });
    return ok(res, post);
  } catch (err) { next(err); }
};

export const adminDeletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {

    try {
      const { PostModel: PM } = await import('../../../infrastructure/database/models/PostModel');
      const { NotificationModel } = await import('../../../infrastructure/database/models/SocialModels');
      const doomed: any = await PM.findById(req.params.postId).select('authorId title');
      if (doomed) {
        const n = await NotificationModel.create({
          userId: doomed.authorId, type: 'admin_note',
          message: `Your post "${doomed.title}" was removed by the moderation team after review.`,
        });
        req.app.locals.io?.to(`user:${doomed.authorId}`).emit('notification', n);
      }
    } catch { /* notification failure must not block deletion */ }

    await postRepo.delete(req.params.postId);
    return ok(res, { deleted: true });
  } catch (err) { next(err); }
};

export const adminGetReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status } = req.query as Record<string, string>;
    const result = await adminGetReportsUseCase.execute({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, status });
    return ok(res, result);
  } catch (err) { next(err); }
};

export const adminReviewReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminNote } = req.body;
    const report = await adminReviewReportUseCase.execute({ reportId: req.params.reportId, status, adminNote });
    return ok(res, report);
  } catch (err) { next(err); }
};
