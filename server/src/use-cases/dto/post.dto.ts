import { IPost, IComment, IReport, PostMedia } from '../../domain/entities/post.types';

export class PostResponseDTO {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly media: PostMedia[];
  readonly visibility: string;
  readonly status: string;
  readonly adminNote?: string;
  readonly likesCount: number;
  readonly likedByMe: boolean;
  readonly commentCount: number;
  readonly sharesCount: number;
  readonly reportCount?: number;
  readonly createdAt: Date;
  readonly author: {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    headline?: string;
    role?: string;
    workStatus?: string;
  };

  constructor(post: IPost, requestingUserId?: string, reportCount?: number) {
    const author = post.authorId as any;

    this.id           = post._id;
    this.title        = post.title;
    this.description  = post.description;
    this.media        = post.media;
    this.visibility   = post.visibility;
    this.status       = post.status ?? 'active';
    this.adminNote    = post.adminNote;
    this.likesCount   = post.likes.length;
    this.likedByMe    = requestingUserId
      ? post.likes.some(id => id.toString() === requestingUserId)
      : false;
    this.commentCount = post.commentCount ?? 0;
    this.sharesCount  = post.shareCount ?? 0;
    this.reportCount  = reportCount;
    this.createdAt    = post.createdAt;
    this.author       = (author == null || typeof author === 'string')
      ? { id: typeof author === 'string' ? author : String(post.authorId) }
      : {
          id:             String(author._id),
          firstName:      author.firstName,
          lastName:       author.lastName,
          profilePicture: author.profilePicture,
          headline:       author.headline,
          role:           author.role,
          workStatus:     author.workStatus,
        };
  }
}

export class PaginatedPostsDTO {
  readonly posts: PostResponseDTO[];
  readonly total: number;
  readonly page: number;
  readonly pages: number;

  constructor(data: { posts: IPost[]; total: number; page: number; pages: number }, requestingUserId: string) {
    this.posts = data.posts.map(p => new PostResponseDTO(p, requestingUserId));
    this.total = data.total;
    this.page  = data.page;
    this.pages = data.pages;
  }
}

export class CommentResponseDTO {
  readonly id: string;
  readonly postId: string;
  readonly parentId?: string;
  readonly text: string;
  readonly likesCount: number;
  readonly likedByMe: boolean;
  readonly createdAt: Date;
  readonly author: {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };

  constructor(comment: IComment, requestingUserId?: string) {
    const author = comment.authorId as any;
    this.id         = comment._id;
    this.postId     = comment.postId;
    this.parentId   = comment.parentId;
    this.text       = comment.text;
    this.likesCount = comment.likes.length;
    this.likedByMe  = requestingUserId
      ? comment.likes.some(id => id.toString() === requestingUserId)
      : false;
    this.createdAt  = comment.createdAt;
    this.author     = (author == null || typeof author === 'string')
      ? { id: typeof author === 'string' ? author : String(comment.authorId) }
      : {
          id:             String(author._id),
          firstName:      author.firstName,
          lastName:       author.lastName,
          profilePicture: author.profilePicture,
        };
  }
}

export class ReportResponseDTO {
  readonly id: string;
  readonly postId: string;
  readonly reason: string;
  readonly description?: string;
  readonly evidenceUrls: string[];
  readonly status: string;
  readonly adminNote?: string;
  readonly createdAt: Date;
  readonly reportedBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profilePicture?: string;
  };

  constructor(report: IReport) {
    const rb = report.reportedBy as any;
    this.id           = report._id;
    this.postId       = report.postId;
    this.reason       = report.reason;
    this.description  = report.description;
    this.evidenceUrls = report.evidenceUrls;
    this.status       = report.status;
    this.adminNote    = report.adminNote;
    this.createdAt    = report.createdAt;
    this.reportedBy   = typeof rb === 'string'
      ? { id: rb }
      : {
          id:             String(rb._id),
          firstName:      rb.firstName,
          lastName:       rb.lastName,
          email:          rb.email,
          profilePicture: rb.profilePicture,
        };
  }
}
