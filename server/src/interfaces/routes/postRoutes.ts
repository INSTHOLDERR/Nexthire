import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { protectAdmin } from '../middlewares/adminMiddleware';
import {
  getFeed, createPost, editPost, deletePost, toggleLike,
  createComment, getComments, likeComment, deleteComment,
  reportPost, getPostReports,
  adminGetPosts, adminUpdatePostStatus, adminDeletePost,
  adminGetReports, adminReviewReport,
} from '../controllers/post/PostController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/quicktime','video/webm','video/x-msvideo',
      'audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/aac',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Admin routes: registered BEFORE the user-auth wall below. Admin tokens are
// signed with the admin secret and would FAIL the user `protect` middleware,
// which was silently logging admins out (401 → token wiped) whenever the
// admin dashboard touched a /posts/admin/* endpoint. protectAdmin does its
// own auth, so these must not pass through `protect` at all.
// ── Admin routes (static prefix, must be before /:postId) ───────────────────
router.get('/admin/posts',                      protectAdmin, adminGetPosts);
router.patch('/admin/posts/:postId/status',     protectAdmin, adminUpdatePostStatus);
router.delete('/admin/posts/:postId',           protectAdmin, adminDeletePost);
router.get('/admin/reports',                    protectAdmin, adminGetReports);
router.patch('/admin/reports/:reportId/review', protectAdmin, adminReviewReport);

// All user routes require auth
router.use(protect);

// ── Static-segment routes FIRST (must be before /:postId to avoid wrong matching) ──
router.post('/comments/:commentId/like',        likeComment);
router.delete('/comments/:commentId',           deleteComment);

// Single post in feed-DTO shape (deep links / notifications / profile detail)
router.get('/single/:postId', async (req, res, next) => {
  try {
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    const doc: any = await PostModel.findById(req.params.postId)
      .populate('authorId', '_id firstName lastName profilePicture role headline workStatus');
    if (!doc || doc.status === 'removed') return res.status(404).json({ success: false, message: 'Post not found.' });
    const me = req.user!.id;
    const a = doc.authorId;
    return res.json({ success: true, data: {
      id: doc._id.toString(), title: doc.title, description: doc.description, media: doc.media ?? [],
      visibility: doc.visibility, status: doc.status ?? 'active',
      likesCount: (doc.likes ?? []).length,
      likedByMe: (doc.likes ?? []).some((id: any) => id.toString() === me),
      commentCount: doc.commentCount ?? 0,
      sharesCount: doc.shareCount ?? 0,
      createdAt: doc.createdAt,
      author: { id: String(a?._id ?? doc.authorId), firstName: a?.firstName, lastName: a?.lastName, profilePicture: a?.profilePicture, headline: a?.headline, role: a?.role, workStatus: a?.workStatus },
    }});
  } catch (err) { next(err); }
});

// Who liked a post (paginated)
router.get('/:postId/likes', async (req, res, next) => {
  try {
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = 20;
    const doc: any = await PostModel.findById(req.params.postId).select('likes');
    if (!doc) return res.status(404).json({ success: false, message: 'Post not found.' });
    const ids = (doc.likes ?? []).slice().reverse(); // most recent likers first
    const total = ids.length;
    const pageIds = ids.slice((page - 1) * limit, page * limit);
    const { default: mongoose } = await import('mongoose');
    const UserModel = mongoose.model('User');
    const users = await UserModel.find({ _id: { $in: pageIds } }).select('_id firstName lastName profilePicture headline');
    // preserve like-order
    const byId = new Map(users.map((u: any) => [u._id.toString(), u]));
    const ordered = pageIds.map((id: any) => byId.get(id.toString())).filter(Boolean);
    return res.json({ success: true, data: { users: ordered, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Record a share (copy-link or share-to-user)
router.post('/:postId/share', async (req, res, next) => {
  try {
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    const doc: any = await PostModel.findByIdAndUpdate(req.params.postId, { $inc: { shareCount: 1 } }, { new: true }).select('shareCount');
    if (!doc) return res.status(404).json({ success: false, message: 'Post not found.' });
    return res.json({ success: true, data: { sharesCount: doc.shareCount } });
  } catch (err) { next(err); }
});

// ── Posts (dynamic :postId routes) ──────────────────────────────────────────
router.get('/',                                 getFeed);
router.post('/', upload.array('media', 10),     createPost);
router.patch('/:postId', upload.array('media', 10), editPost);
router.delete('/:postId',                       deletePost);
router.post('/:postId/like',                    toggleLike);

// ── Comments under a post ────────────────────────────────────────────────────
router.get('/:postId/comments',                 getComments);
router.post('/:postId/comments',                createComment);

// ── Reports ──────────────────────────────────────────────────────────────────
router.post('/:postId/report', upload.array('evidence', 5), reportPost);
router.get('/:postId/reports',                  getPostReports);

export default router;
