import { IPostRepository, PostFilter, PaginatedPosts, PaginatedComments, PaginatedReports } from '../../domain/repositories/post.repository';
import { IPost, IComment, IReport, PostStatus } from '../../domain/entities/post.types';
import { PostModel, CommentModel, ReportModel } from '../database/models/PostModel';
import { BaseRepository } from './BaseRepository';

const AUTHOR_SELECT = '_id firstName lastName profilePicture role headline workStatus';
const COMMENT_AUTHOR_SELECT = '_id firstName lastName profilePicture';

export class MongoPostRepository extends BaseRepository<IPost> implements IPostRepository {
  protected mapToEntity(doc: any): IPost {
    return {
      _id:          doc._id.toString(),
      authorId:     doc.authorId,
      title:        doc.title,
      description:  doc.description,
      media:        doc.media ?? [],
      visibility:   doc.visibility,
      status:       doc.status ?? 'active',
      adminNote:    doc.adminNote ?? undefined,
      likes:        (doc.likes ?? []).map((id: any) => id.toString()),
      commentCount: doc.commentCount ?? 0,
      shareCount:   doc.shareCount ?? 0,
      createdAt:    doc.createdAt,
      updatedAt:    doc.updatedAt,
    };
  }

  private mapComment(doc: any): IComment {
    return {
      _id:       doc._id.toString(),
      postId:    doc.postId.toString(),
      authorId:  doc.authorId,
      parentId:  doc.parentId?.toString() ?? undefined,
      text:      doc.text,
      likes:     (doc.likes ?? []).map((id: any) => id.toString()),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapReport(doc: any): IReport {
    return {
      _id:          doc._id.toString(),
      postId:       doc.postId.toString(),
      reportedBy:   doc.reportedBy,
      reason:       doc.reason,
      description:  doc.description,
      evidenceUrls: doc.evidenceUrls ?? [],
      status:       doc.status,
      adminNote:    doc.adminNote,
      createdAt:    doc.createdAt,
      updatedAt:    doc.updatedAt,
    };
  }

  // ── Posts ─────────────────────────────────────────────────────────────────

  async create(data: Partial<IPost>): Promise<IPost> {
    const doc = await PostModel.create(data);
    return this.mapToEntity(doc);
  }

  async findById(id: string): Promise<IPost | null> {
    const doc = await PostModel.findById(id).populate('authorId', AUTHOR_SELECT);
    return doc ? this.mapToEntity(doc) : null;
  }

  async findFeed({ requestingUserId, page, limit, search }: PostFilter): Promise<PaginatedPosts> {
    const query: any = {
      status: 'active',
      $or: [
        { visibility: 'public' },
        { visibility: 'private', authorId: requestingUserId },
      ],
    };
    if (search?.trim()) {
      query.$and = [
        { $or: [
          { title:       { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ]},
      ];
    }
    const [total, docs] = await Promise.all([
      PostModel.countDocuments(query),
      PostModel.find(query)
        .populate('authorId', AUTHOR_SELECT)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return { posts: docs.map(d => this.mapToEntity(d)), total, page, pages: Math.ceil(total / limit) };
  }

  async findByAuthor(authorId: string): Promise<IPost[]> {
    const docs = await PostModel.find({ authorId }).sort({ createdAt: -1 });
    return docs.map(d => this.mapToEntity(d));
  }

  async update(id: string, data: Partial<IPost>): Promise<IPost | null> {
    const doc = await PostModel.findByIdAndUpdate(id, data, { new: true }).populate('authorId', AUTHOR_SELECT);
    return doc ? this.mapToEntity(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await PostModel.findByIdAndDelete(id);
    await CommentModel.deleteMany({ postId: id });
    await ReportModel.deleteMany({ postId: id });
  }

  async toggleLike(postId: string, userId: string): Promise<IPost | null> {
    const post = await PostModel.findById(postId);
    if (!post) return null;
    const liked = post.likes.some((id: any) => id.toString() === userId);
    if (liked) {
      post.likes = post.likes.filter((id: any) => id.toString() !== userId) as any;
    } else {
      (post.likes as any[]).push(userId);
    }
    await post.save();
    return this.mapToEntity(post);
  }

  async adminUpdateStatus(postId: string, status: PostStatus, adminNote?: string): Promise<IPost | null> {
    const update: any = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    const doc = await PostModel.findByIdAndUpdate(postId, update, { new: true }).populate('authorId', AUTHOR_SELECT);
    return doc ? this.mapToEntity(doc) : null;
  }

  async adminFindAll(page: number, limit: number): Promise<PaginatedPosts> {
    const [total, docs] = await Promise.all([
      PostModel.countDocuments(),
      PostModel.find()
        .populate('authorId', AUTHOR_SELECT)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return { posts: docs.map(d => this.mapToEntity(d)), total, page, pages: Math.ceil(total / limit) };
  }

  async incrementCommentCount(postId: string, by: number): Promise<void> {
    await PostModel.findByIdAndUpdate(postId, { $inc: { commentCount: by } });
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async createComment(data: Partial<IComment>): Promise<IComment> {
    const doc = await CommentModel.create(data);
    const populated = await CommentModel.findById(doc._id).populate('authorId', COMMENT_AUTHOR_SELECT);
    return this.mapComment(populated ?? doc);
  }

  async findCommentById(id: string): Promise<IComment | null> {
    const doc = await CommentModel.findById(id).populate('authorId', COMMENT_AUTHOR_SELECT);
    return doc ? this.mapComment(doc) : null;
  }

  async findCommentsByPost(postId: string, parentId: string | null, page: number, limit: number): Promise<PaginatedComments> {
    const query: any = { postId, parentId: parentId ?? null };
    const [total, docs] = await Promise.all([
      CommentModel.countDocuments(query),
      CommentModel.find(query)
        .populate('authorId', COMMENT_AUTHOR_SELECT)
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return { comments: docs.map(d => this.mapComment(d)), total };
  }

  async toggleCommentLike(commentId: string, userId: string): Promise<IComment | null> {
    const comment = await CommentModel.findById(commentId);
    if (!comment) return null;
    const liked = comment.likes.some((id: any) => id.toString() === userId);
    if (liked) {
      comment.likes = comment.likes.filter((id: any) => id.toString() !== userId) as any;
    } else {
      (comment.likes as any[]).push(userId);
    }
    await comment.save();
    const populated = await CommentModel.findById(commentId).populate('authorId', COMMENT_AUTHOR_SELECT);
    return populated ? this.mapComment(populated) : null;
  }

  async deleteComment(id: string): Promise<void> {
    await CommentModel.deleteMany({ $or: [{ _id: id }, { parentId: id }] });
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async createReport(data: Partial<IReport>): Promise<IReport> {
    const doc = await ReportModel.create(data);
    const populated = await ReportModel.findById(doc._id).populate('reportedBy', '_id firstName lastName email profilePicture');
    return this.mapReport(populated ?? doc);
  }

  async hasReported(postId: string, userId: string): Promise<boolean> {
    const r = await ReportModel.findOne({ postId, reportedBy: userId });
    return !!r;
  }

  async findReportsByPost(postId: string, page: number, limit: number): Promise<PaginatedReports> {
    const [total, docs] = await Promise.all([
      ReportModel.countDocuments({ postId }),
      ReportModel.find({ postId })
        .populate('reportedBy', '_id firstName lastName email profilePicture')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return { reports: docs.map(d => this.mapReport(d)), total, page, pages: Math.ceil(total / limit), limit };
  }

  async findAllReports(page: number, limit: number, status?: string): Promise<PaginatedReports> {
    const query: any = {};
    if (status) query.status = status;
    const [total, docs] = await Promise.all([
      ReportModel.countDocuments(query),
      ReportModel.find(query)
        .populate('reportedBy', '_id firstName lastName email profilePicture')
        .populate('postId', '_id title authorId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return { reports: docs.map(d => this.mapReport(d)), total, page, pages: Math.ceil(total / limit), limit };
  }

  async updateReportStatus(reportId: string, status: string, adminNote?: string): Promise<IReport | null> {
    const update: any = { status };
    if (adminNote) update.adminNote = adminNote;
    const doc = await ReportModel.findByIdAndUpdate(reportId, update, { new: true })
      .populate('reportedBy', '_id firstName lastName email profilePicture');
    return doc ? this.mapReport(doc) : null;
  }

  async countReportsByPost(postId: string): Promise<number> {
    return ReportModel.countDocuments({ postId });
  }
}

export default new MongoPostRepository();
