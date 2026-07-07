import { Router } from 'express';
import multer from 'multer';
import { adminLogin } from '../controllers/admin/AdminAuthController';
import { protectAdmin } from '../middlewares/adminMiddleware';
import { protect, protectAllowRestricted } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { getUsers, setUserStatus, getAppeals, reviewAppeal, getUserAppeals } from '../controllers/admin/AdminController';
import { submitAppeal } from '../controllers/admin/AppealSubmissionController';
import { AppealType, UserRole } from '../../domain/entities/enums';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Admin authentication (public)
router.post('/login', adminLogin);

// Admin-protected routes
router.get('/users',                       protectAdmin, getUsers);
router.patch('/users/:userId/status',      protectAdmin, setUserStatus);
router.get('/appeals',                     protectAdmin, getAppeals);
router.patch('/appeals/:appealId/review',  protectAdmin, reviewAppeal);
router.get('/appeals/user/:userId',        protectAdmin, getUserAppeals);

// ─── Dashboard stats ──────────────────────────────────────────────────────────

// ─── Detail views: everything about ONE user / ONE post in a single call ─────

router.get('/users/:userId/detail', protectAdmin, async (req, res, next) => {
  try {
    const { UserModel } = await import('../../infrastructure/database/models/UserModel');
    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');
    const { AppealModel } = await import('../../infrastructure/database/models/AppealModel');

    const user = await UserModel.findById(req.params.userId)
      .select('_id firstName lastName email profilePicture headline role workStatus status location createdAt connections');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const myPostIds = await PostModel.find({ authorId: user._id }).distinct('_id');

    const [reportsAgainst, warnings, appeals, postsCount] = await Promise.all([
      // Reports on the user directly AND on any of their posts
      ReportModel.find({
        $or: [
          { targetType: 'user', targetUserId: user._id },
          { targetType: 'post', postId: { $in: myPostIds } },
        ],
      })
        .populate('reportedBy', '_id firstName lastName profilePicture email')
        .populate('postId', '_id title status')
        .sort({ status: 1, createdAt: -1 }),
      WarningModel.find({ userId: user._id }).populate('postId', '_id title').sort({ createdAt: -1 }),
      AppealModel.find({ userId: user._id }).sort({ createdAt: -1 }),
      PostModel.countDocuments({ authorId: user._id, status: { $ne: 'removed' } }),
    ]);

    res.json({ success: true, data: { user, reportsAgainst, warnings, appeals, postsCount, connectionsCount: (user as any).connections?.length ?? 0 } });
  } catch (err) { next(err); }
});

router.get('/posts/:postId/detail', protectAdmin, async (req, res, next) => {
  try {
    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');

    const post: any = await PostModel.findById(req.params.postId)
      .populate('authorId', '_id firstName lastName email profilePicture status role');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const reports = await ReportModel.find({ targetType: 'post', postId: post._id })
      .populate('reportedBy', '_id firstName lastName profilePicture email')
      .sort({ status: 1, createdAt: -1 });

    res.json({ success: true, data: { post, reports } });
  } catch (err) { next(err); }
});


router.get('/stats', protectAdmin, async (_req, res, next) => {
  try {
    // Serve from Redis when available — the dashboard polls this endpoint and
    // the 17 countDocuments queries are needlessly heavy to run every time.
    const { default: cache } = await import('../../infrastructure/services/CacheService');
    const cached = await cache.get<Record<string, unknown>>('admin:stats');
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const { UserModel } = await import('../../infrastructure/database/models/UserModel');
    const { PostModel, ReportModel } = await import('../../infrastructure/database/models/PostModel');
    const { AppealModel } = await import('../../infrastructure/database/models/AppealModel');
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');

    const [
      totalUsers, roleUser, roleJobseeker, roleRecruiter,
      activeUsers, suspendedUsers, bannedUsers,
      totalPosts, activePosts, suspendedPosts,
      pendingReports, pendingPostReports, pendingUserReports,
      pendingAppeals,
      activeWarnings, pendingWarningAppeals,
      usersLast7,
    ] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ role: 'user' }),
      UserModel.countDocuments({ role: 'jobseeker' }),
      UserModel.countDocuments({ role: 'recruiter' }),
      UserModel.countDocuments({ status: 'active' }),
      UserModel.countDocuments({ status: 'suspended' }),
      UserModel.countDocuments({ status: 'banned' }),
      PostModel.countDocuments({ status: { $ne: 'removed' } }),
      PostModel.countDocuments({ status: 'active' }),
      PostModel.countDocuments({ status: 'suspended' }),
      ReportModel.countDocuments({ status: 'pending' }),
      ReportModel.countDocuments({ status: 'pending', targetType: 'post' }),
      ReportModel.countDocuments({ status: 'pending', targetType: 'user' }),
      AppealModel.countDocuments({ status: 'pending' }),
      WarningModel.countDocuments({ status: 'active' }),
      WarningModel.countDocuments({ appealStatus: 'pending' }),
      UserModel.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
    ]);

    const data = {
      users: { total: totalUsers, user: roleUser, jobseeker: roleJobseeker, recruiter: roleRecruiter, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers, newLast7Days: usersLast7 },
      posts: { total: totalPosts, active: activePosts, suspended: suspendedPosts },
      reports: { pending: pendingReports, pendingPost: pendingPostReports, pendingUser: pendingUserReports },
      appeals: { pending: pendingAppeals },
      warnings: { active: activeWarnings, appealsPending: pendingWarningAppeals },
    };
    await cache.set('admin:stats', data, 60);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── Moderation queue: everything pending, with the user each item belongs to ──
// Powers the "Needs review" strips at the top of the Users and Posts sections.

router.get('/moderation-queue', protectAdmin, async (_req, res, next) => {
  try {
    const { ReportModel } = await import('../../infrastructure/database/models/PostModel');
    const { AppealModel } = await import('../../infrastructure/database/models/AppealModel');
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');

    const [userReports, postReports, appeals, warningAppeals] = await Promise.all([
      ReportModel.find({ status: 'pending', targetType: 'user' })
        .populate('targetUserId', '_id firstName lastName profilePicture email status')
        .populate('reportedBy', '_id firstName lastName')
        .sort({ createdAt: -1 }).limit(30),
      ReportModel.find({ status: 'pending', targetType: 'post' })
        .populate({ path: 'postId', select: '_id title authorId', populate: { path: 'authorId', select: '_id firstName lastName profilePicture' } })
        .populate('reportedBy', '_id firstName lastName')
        .sort({ createdAt: -1 }).limit(30),
      AppealModel.find({ status: 'pending' })
        .populate('userId', '_id firstName lastName profilePicture email status')
        .sort({ createdAt: -1 }).limit(30),
      WarningModel.find({ appealStatus: 'pending' })
        .populate('userId', '_id firstName lastName profilePicture email')
        .sort({ createdAt: -1 }).limit(30),
    ]);

    res.json({ success: true, data: { userReports, postReports, appeals, warningAppeals } });
  } catch (err) { next(err); }
});

// ─── Per-user overview: everything about one user in a single call ────────────
// Profile + reports against them + warnings + account appeals — the Users
// section drawer is built entirely from this.

router.get('/users/:userId/overview', protectAdmin, async (req, res, next) => {
  try {
    const { UserModel } = await import('../../infrastructure/database/models/UserModel');
    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');
    const { AppealModel } = await import('../../infrastructure/database/models/AppealModel');

    const userId = req.params.userId;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const myPostIds = await PostModel.find({ authorId: userId }).distinct('_id');

    const [reports, warnings, appeals, postsCount] = await Promise.all([
      // Reports where this user is the offender: direct user reports + reports on their posts
      ReportModel.find({
        $or: [
          { targetType: 'user', targetUserId: userId },
          { targetType: 'post', postId: { $in: myPostIds } },
        ],
      })
        .populate('reportedBy', '_id firstName lastName profilePicture email')
        .populate('postId', '_id title status')
        .sort({ status: 1, createdAt: -1 }),
      WarningModel.find({ userId }).populate('postId', '_id title').sort({ createdAt: -1 }),
      AppealModel.find({ userId }).sort({ createdAt: -1 }),
      PostModel.countDocuments({ authorId: userId, status: { $ne: 'removed' } }),
    ]);

    res.json({ success: true, data: { user, reports, warnings, appeals, postsCount } });
  } catch (err) { next(err); }
});

// ─── Per-post overview: post + all reports against it ─────────────────────────

router.get('/posts/:postId/overview', protectAdmin, async (req, res, next) => {
  try {
    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');
    const post: any = await PostModel.findById(req.params.postId)
      .populate('authorId', '_id firstName lastName profilePicture email status');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const reports = await ReportModel.find({ targetType: 'post', postId: post._id })
      .populate('reportedBy', '_id firstName lastName profilePicture email')
      .sort({ status: 1, createdAt: -1 });

    res.json({ success: true, data: { post, reports } });
  } catch (err) { next(err); }
});

// ─── Posts (admin management) ─────────────────────────────────────────────────

router.get('/posts', protectAdmin, async (req, res, next) => {
  try {
    const { PostModel, ReportModel } = await import('../../infrastructure/database/models/PostModel');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = 12;
    const search = (req.query.search as string)?.trim();
    const status = (req.query.status as string) || undefined;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    const [docs, total] = await Promise.all([
      PostModel.find(filter)
        .populate('authorId', '_id firstName lastName email profilePicture status')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit),
      PostModel.countDocuments(filter),
    ]);
    const posts = await Promise.all(docs.map(async (d: any) => ({
      _id: d._id, title: d.title, description: d.description, media: d.media ?? [],
      visibility: d.visibility, status: d.status, adminNote: d.adminNote,
      likesCount: (d.likes ?? []).length, commentCount: d.commentCount ?? 0, shareCount: d.shareCount ?? 0,
      createdAt: d.createdAt, author: d.authorId,
      reportCount: await ReportModel.countDocuments({ postId: d._id }),
    })));
    res.json({ success: true, data: { posts, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.patch('/posts/:postId/status', protectAdmin, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body as { status: 'active' | 'suspended' | 'removed'; adminNote?: string };
    if (!['active', 'suspended', 'removed'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    const { NotificationModel } = await import('../../infrastructure/database/models/SocialModels');
    const post: any = await PostModel.findByIdAndUpdate(req.params.postId, { status, adminNote: adminNote ?? null }, { new: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (status === 'suspended') {
      const n = await NotificationModel.create({
        userId: post.authorId, type: 'post_suspended', postId: post._id,
        message: `Your post "${post.title}" was suspended by the moderation team${adminNote ? `: ${adminNote}` : '.'}`,
      });
      req.app.locals.io?.to(`user:${post.authorId}`).emit('notification', n);
    }
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
});

router.delete('/posts/:postId', protectAdmin, async (req, res, next) => {
  try {
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    await PostModel.findByIdAndDelete(req.params.postId);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
});

// ─── Reports (posts + users, unified moderation queue) ────────────────────────

router.get('/reports', protectAdmin, async (req, res, next) => {
  try {
    const { ReportModel } = await import('../../infrastructure/database/models/PostModel');
    const targetType = (req.query.targetType as string) || undefined; // 'post' | 'user'
    const status = (req.query.status as string) || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = 15;
    const filter: Record<string, unknown> = {};
    if (targetType) filter.targetType = targetType;
    if (status) filter.status = status;
    const [docs, total] = await Promise.all([
      ReportModel.find(filter)
        .populate('reportedBy', '_id firstName lastName profilePicture email')
        .populate('targetUserId', '_id firstName lastName profilePicture email status')
        .populate({ path: 'postId', select: '_id title description status authorId', populate: { path: 'authorId', select: '_id firstName lastName email status' } })
        .sort({ status: 1, createdAt: -1 }) // pending first
        .skip((page - 1) * limit).limit(limit),
      ReportModel.countDocuments(filter),
    ]);
    // Per-target active report counts help the admin judge escalation
    res.json({ success: true, data: { reports: docs, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Review a report with an action:
//   dismiss       → mark reviewed, nothing else
//   warn          → create a Warning for the offending user (+ notify)
//   suspend_post  → post.status = suspended (+ notify author)
//   suspend_user  → user.status = suspended
//   ban_user      → user.status = banned
router.patch('/reports/:reportId/action', protectAdmin, async (req, res, next) => {
  try {
    const { action, adminNote } = req.body as { action: string; adminNote?: string };
    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');
    const { UserModel } = await import('../../infrastructure/database/models/UserModel');
    const { NotificationModel } = await import('../../infrastructure/database/models/SocialModels');

    const report: any = await ReportModel.findById(req.params.reportId).populate('postId', '_id title authorId');
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    // Who is the offending user for this report?
    const offenderId: string | null = report.targetType === 'user'
      ? String(report.targetUserId)
      : report.postId ? String((report.postId as any).authorId) : null;

    const io = req.app.locals.io;
    const notify = async (userId: string, type: string, message: string, postId?: string) => {
      const n = await NotificationModel.create({ userId, type, message, postId: postId ?? null });
      io?.to(`user:${userId}`).emit('notification', n);
    };

    switch (action) {
      case 'dismiss':
        break;

      case 'warn': {
        if (!offenderId) return res.status(400).json({ success: false, message: 'No offending user on this report.' });
        await WarningModel.create({
          userId: offenderId,
          reportId: report._id,
          postId: report.postId?._id ?? null,
          reason: `Report: ${report.reason}`,
          note: adminNote ?? '',
        });
        await notify(offenderId, 'warning',
          `You received a warning from the moderation team${adminNote ? `: ${adminNote}` : '.'} You can view and appeal it in "My warnings".`);
        break;
      }

      case 'suspend_post': {
        if (!report.postId) return res.status(400).json({ success: false, message: 'This report has no post.' });
        await PostModel.findByIdAndUpdate(report.postId._id, { status: 'suspended', adminNote: adminNote ?? 'Suspended after review of reports.' });
        if (offenderId) await notify(offenderId, 'post_suspended',
          `Your post "${(report.postId as any).title}" was suspended after review${adminNote ? `: ${adminNote}` : '.'}`, String(report.postId._id));
        break;
      }

      case 'suspend_user': {
        if (!offenderId) return res.status(400).json({ success: false, message: 'No offending user on this report.' });
        await UserModel.findByIdAndUpdate(offenderId, { status: 'suspended' });
        break;
      }

      case 'ban_user': {
        if (!offenderId) return res.status(400).json({ success: false, message: 'No offending user on this report.' });
        await UserModel.findByIdAndUpdate(offenderId, { status: 'banned' });
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Unknown action.' });
    }

    report.status = 'resolved';
    report.adminNote = adminNote ?? report.adminNote;
    await report.save();
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// ─── Warnings (admin side) ────────────────────────────────────────────────────

router.get('/warnings', protectAdmin, async (req, res, next) => {
  try {
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = 15;
    const filter: Record<string, unknown> = {};
    if (req.query.appealStatus) filter.appealStatus = req.query.appealStatus;
    const [docs, total] = await Promise.all([
      WarningModel.find(filter)
        .populate('userId', '_id firstName lastName email profilePicture status')
        .populate('postId', '_id title')
        .sort({ appealStatus: -1, createdAt: -1 })
        .skip((page - 1) * limit).limit(limit),
      WarningModel.countDocuments(filter),
    ]);
    res.json({ success: true, data: { warnings: docs, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Review a warning appeal: approve → warning revoked; reject → warning stays active
router.patch('/warnings/:id/appeal-review', protectAdmin, async (req, res, next) => {
  try {
    const { decision, adminNote } = req.body as { decision: 'approved' | 'rejected'; adminNote?: string };
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ success: false, message: 'Invalid decision.' });
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');
    const { NotificationModel } = await import('../../infrastructure/database/models/SocialModels');

    const warning: any = await WarningModel.findById(req.params.id);
    if (!warning) return res.status(404).json({ success: false, message: 'Warning not found.' });
    if (warning.appealStatus !== 'pending') return res.status(409).json({ success: false, message: 'No pending appeal.' });

    warning.appealStatus = decision;
    warning.appealAdminNote = adminNote ?? '';
    warning.status = decision === 'approved' ? 'revoked' : 'active';
    await warning.save();

    const n = await NotificationModel.create({
      userId: warning.userId, type: 'admin_note',
      message: decision === 'approved'
        ? 'Your warning appeal was approved — the warning has been revoked.'
        : `Your warning appeal was rejected${adminNote ? `: ${adminNote}` : '.'}`,
    });
    req.app.locals.io?.to(`user:${warning.userId}`).emit('notification', n);
    res.json({ success: true, data: warning });
  } catch (err) { next(err); }
});

// Revoke a warning directly
router.patch('/warnings/:id/revoke', protectAdmin, async (req, res, next) => {
  try {
    const { WarningModel } = await import('../../infrastructure/database/models/WarningModel');
    const w = await WarningModel.findByIdAndUpdate(req.params.id, { status: 'revoked' }, { new: true });
    if (!w) return res.status(404).json({ success: false, message: 'Warning not found.' });
    res.json({ success: true, data: w });
  } catch (err) { next(err); }
});

// Appeal submission — protectAllowRestricted verifies JWT but allows banned/suspended
// users through (they are exactly who needs to submit an appeal).
// requireRole ensures only real, onboarded users (not anonymous) can submit.
router.post('/appeals/suspension',
  protectAllowRestricted,
  requireRole(UserRole.JOBSEEKER, UserRole.STUDENT),
  upload.array('evidence', 5),
  submitAppeal(AppealType.SUSPENSION)
);
router.post('/appeals/ban',
  protectAllowRestricted,
  requireRole(UserRole.JOBSEEKER, UserRole.STUDENT),
  upload.array('evidence', 5),
  submitAppeal(AppealType.BAN)
);

export default router;
