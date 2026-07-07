import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import cloudinary from '../../infrastructure/services/CloudinaryService';
import mongoose from 'mongoose';
import { setupProfile } from '../controllers/profile/ProfileController';

const router = Router();
router.use(protect);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const ok  = (res: Response, data: unknown) => res.json({ success: true, data });
const uid = (req: Request) => req.user!.id;

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTANT: ALL /me/* static routes MUST come before the dynamic /:userId
// route, or Express will match "me" as a userId parameter and fail.
// ══════════════════════════════════════════════════════════════════════════════

// ── Profile viewers list ─────────────────────────────────────────────────────

router.get('/me/viewers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await UserModel.findById(uid(req))
      .populate('profileViewers', '_id firstName lastName profilePicture headline role workStatus');
    return ok(res, me?.profileViewers ?? []);
  } catch (err) { next(err); }
});

// ── Block / Unblock ───────────────────────────────────────────────────────────

router.post('/me/block/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UserModel.findByIdAndUpdate(uid(req), { $addToSet: { blockedUsers: req.params.targetId } });
    return ok(res, { done: true });
  } catch (err) { next(err); }
});

router.post('/me/unblock/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UserModel.findByIdAndUpdate(uid(req), { $pull: { blockedUsers: req.params.targetId } });
    return ok(res, { done: true });
  } catch (err) { next(err); }
});

router.get('/me/blocked', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await UserModel.findById(uid(req))
      .populate('blockedUsers', '_id firstName lastName profilePicture headline');
    return ok(res, me?.blockedUsers ?? []);
  } catch (err) { next(err); }
});

// ── Onboarding setup ──────────────────────────────────────────────────────────
router.put('/setup', upload.single('profilePicture'), setupProfile);

// ── Update basic profile info (with image + resume upload) ───────────────────
router.patch('/me/basic', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'coverPicture',   maxCount: 1 },
  { name: 'resume',         maxCount: 1 },
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files  = req.files as Record<string, Express.Multer.File[]> | undefined;
    const body   = req.body;
    const update: any = {};

    const FIELDS = [
      'firstName','lastName','headline','about','location','phone','workStatus',
      'jobTitle','company','school','degree','fieldOfStudy','startYear',
    ];
    FIELDS.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });

    // Changing work status also changes the role:
    //   open_to_work → jobseeker · currently_hiring → recruiter · none → user
    if (update.workStatus !== undefined) {
      update.role =
        update.workStatus === 'open_to_work'     ? 'jobseeker'
        : update.workStatus === 'currently_hiring' ? 'recruiter'
        : 'user';
    }

    if (files?.profilePicture?.[0]) {
      const result = await cloudinary.uploadMedia(files.profilePicture[0].buffer, 'nexthire/profiles', 'image');
      update.profilePicture = result.url;
    }
    if (files?.coverPicture?.[0]) {
      const result = await cloudinary.uploadMedia(files.coverPicture[0].buffer, 'nexthire/covers', 'image');
      update.coverPicture = result.url;
    }
    if (files?.resume?.[0]) {
      const result = await cloudinary.uploadMedia(files.resume[0].buffer, 'nexthire/resumes', 'raw');
      // Store the CLEAN url. The client derives:
      //   view url     → resumeUrl (opens inline in the browser)
      //   download url → resumeUrl with `fl_attachment:<name>` inserted
      // Baking fl_attachment into the stored url would force "View Resume" to download instead of open.
      update.resumeUrl          = result.url;
      update.resumePublicId     = result.publicId;
      update.resumeOriginalName = files.resume[0].originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    const user = await UserModel.findByIdAndUpdate(
      uid(req), { $set: update }, { new: true }
    ).select('-password -googleId');

    return ok(res, user);
  } catch (err) { next(err); }
});

// ── Skills ────────────────────────────────────────────────────────────────────
router.post('/me/skills', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $push: { skills: req.body } }, { new: true }).select('skills');
    return ok(res, user?.skills);
  } catch (err) { next(err); }
});
router.patch('/me/skills/:id', async (req, res, next) => {
  try {
    const set: any = {};
    Object.entries(req.body).forEach(([k,v]) => { set[`skills.$.${k}`] = v; });
    const user = await UserModel.findOneAndUpdate({ _id: uid(req), 'skills._id': req.params.id }, { $set: set }, { new: true }).select('skills');
    return ok(res, user?.skills);
  } catch (err) { next(err); }
});
router.delete('/me/skills/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $pull: { skills: { _id: req.params.id } } }, { new: true }).select('skills');
    return ok(res, user?.skills);
  } catch (err) { next(err); }
});

// ── Projects ──────────────────────────────────────────────────────────────────
router.post('/me/projects', upload.single('image'), async (req, res, next) => {
  try {
    const data: any = { ...req.body };
    if (req.body.otherLinks) data.otherLinks = JSON.parse(req.body.otherLinks);
    if (req.body.skills)     data.skills     = JSON.parse(req.body.skills);
    if (req.file) { const imgResult = await cloudinary.uploadMedia(req.file.buffer, 'nexthire/projects', 'image'); data.imageUrl = imgResult.url; }
    const user = await UserModel.findByIdAndUpdate(uid(req), { $push: { projects: data } }, { new: true }).select('projects');
    return ok(res, user?.projects);
  } catch (err) { next(err); }
});
router.patch('/me/projects/:id', upload.single('image'), async (req, res, next) => {
  try {
    const data: any = { ...req.body };
    if (req.body.otherLinks) data.otherLinks = JSON.parse(req.body.otherLinks);
    if (req.body.skills)     data.skills     = JSON.parse(req.body.skills);
    if (req.file) { const imgResult = await cloudinary.uploadMedia(req.file.buffer, 'nexthire/projects', 'image'); data.imageUrl = imgResult.url; }
    const set: any = {};
    Object.entries(data).forEach(([k,v]) => { set[`projects.$.${k}`] = v; });
    const user = await UserModel.findOneAndUpdate({ _id: uid(req), 'projects._id': req.params.id }, { $set: set }, { new: true }).select('projects');
    return ok(res, user?.projects);
  } catch (err) { next(err); }
});
router.delete('/me/projects/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $pull: { projects: { _id: req.params.id } } }, { new: true }).select('projects');
    return ok(res, user?.projects);
  } catch (err) { next(err); }
});

// ── Experience ────────────────────────────────────────────────────────────────
router.post('/me/experiences', async (req, res, next) => {
  try {
    const d = { ...req.body, skills: req.body.skills ? JSON.parse(req.body.skills) : [] };
    const user = await UserModel.findByIdAndUpdate(uid(req), { $push: { experiences: d } }, { new: true }).select('experiences');
    return ok(res, user?.experiences);
  } catch (err) { next(err); }
});
router.patch('/me/experiences/:id', async (req, res, next) => {
  try {
    const data: any = { ...req.body };
    if (req.body.skills) data.skills = JSON.parse(req.body.skills);
    const set: any = {};
    Object.entries(data).forEach(([k,v]) => { set[`experiences.$.${k}`] = v; });
    const user = await UserModel.findOneAndUpdate({ _id: uid(req), 'experiences._id': req.params.id }, { $set: set }, { new: true }).select('experiences');
    return ok(res, user?.experiences);
  } catch (err) { next(err); }
});
router.delete('/me/experiences/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $pull: { experiences: { _id: req.params.id } } }, { new: true }).select('experiences');
    return ok(res, user?.experiences);
  } catch (err) { next(err); }
});

// ── Education ─────────────────────────────────────────────────────────────────
router.post('/me/educations', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $push: { educations: req.body } }, { new: true }).select('educations');
    return ok(res, user?.educations);
  } catch (err) { next(err); }
});
router.patch('/me/educations/:id', async (req, res, next) => {
  try {
    const set: any = {};
    Object.entries(req.body).forEach(([k,v]) => { set[`educations.$.${k}`] = v; });
    const user = await UserModel.findOneAndUpdate({ _id: uid(req), 'educations._id': req.params.id }, { $set: set }, { new: true }).select('educations');
    return ok(res, user?.educations);
  } catch (err) { next(err); }
});
router.delete('/me/educations/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $pull: { educations: { _id: req.params.id } } }, { new: true }).select('educations');
    return ok(res, user?.educations);
  } catch (err) { next(err); }
});

// ── Languages ─────────────────────────────────────────────────────────────────
router.post('/me/languages', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $push: { languages: req.body } }, { new: true }).select('languages');
    return ok(res, user?.languages);
  } catch (err) { next(err); }
});
router.patch('/me/languages/:id', async (req, res, next) => {
  try {
    const set: any = {};
    Object.entries(req.body).forEach(([k,v]) => { set[`languages.$.${k}`] = v; });
    const user = await UserModel.findOneAndUpdate({ _id: uid(req), 'languages._id': req.params.id }, { $set: set }, { new: true }).select('languages');
    return ok(res, user?.languages);
  } catch (err) { next(err); }
});
router.delete('/me/languages/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $pull: { languages: { _id: req.params.id } } }, { new: true }).select('languages');
    return ok(res, user?.languages);
  } catch (err) { next(err); }
});

// ── Contacts ──────────────────────────────────────────────────────────────────
router.post('/me/contacts', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $push: { contacts: req.body } }, { new: true }).select('contacts');
    return ok(res, user?.contacts);
  } catch (err) { next(err); }
});
router.patch('/me/contacts/:id', async (req, res, next) => {
  try {
    const set: any = {};
    Object.entries(req.body).forEach(([k,v]) => { set[`contacts.$.${k}`] = v; });
    const user = await UserModel.findOneAndUpdate({ _id: uid(req), 'contacts._id': req.params.id }, { $set: set }, { new: true }).select('contacts');
    return ok(res, user?.contacts);
  } catch (err) { next(err); }
});
router.delete('/me/contacts/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findByIdAndUpdate(uid(req), { $pull: { contacts: { _id: req.params.id } } }, { new: true }).select('contacts');
    return ok(res, user?.contacts);
  } catch (err) { next(err); }
});

// ── Account actions ───────────────────────────────────────────────────────────
router.post('/me/deactivate', async (req, res, next) => {
  try {
    await UserModel.findByIdAndUpdate(uid(req), { isDeactivated: true, deactivatedAt: new Date() });
    return ok(res, { message: 'Account deactivated.' });
  } catch (err) { next(err); }
});
router.delete('/me/delete', async (req, res, next) => {
  try {
    await UserModel.findByIdAndDelete(uid(req));
    return ok(res, { message: 'Account permanently deleted.' });
  } catch (err) { next(err); }
});

// ── Get a user's posts ────────────────────────────────────────────────────────
router.get('/me/posts', async (req, res, next) => {
  try {
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    const page = Number((req.query as any).page ?? 1);
    const limit = 10;
    const [docs, total] = await Promise.all([
      PostModel.find({ authorId: uid(req), status: { $ne: 'removed' } })
        .populate('authorId', '_id firstName lastName profilePicture headline role workStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PostModel.countDocuments({ authorId: uid(req), status: { $ne: 'removed' } }),
    ]);
    return ok(res, { posts: docs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// User's posts (by ID) for viewing others' profiles
router.get('/:userId/posts', async (req, res, next) => {
  try {
    const { PostModel } = await import('../../infrastructure/database/models/PostModel');
    const page = Number((req.query as any).page ?? 1);
    const limit = 10;
    const query: any = { authorId: req.params.userId, visibility: 'public', status: 'active' };
    const [docs, total] = await Promise.all([
      PostModel.find(query)
        .populate('authorId', '_id firstName lastName profilePicture headline role workStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PostModel.countDocuments(query),
    ]);
    return ok(res, { posts: docs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── Get a profile ─────────────────────────────────────────────────────────────
// NOTE: This dynamic route must come LAST to avoid matching /me/* paths
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = uid(req);
    const { userId } = req.params;

    const user = await UserModel.findById(userId)
      .select('-password -googleId -connectionRequests -pendingConnections -blockedUsers -profileViewers');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let isBlockedByMe = false;
    if (viewerId !== userId) {
      const [, me] = await Promise.all([
        UserModel.findByIdAndUpdate(userId, {
          $inc: { profileViews: 1 },
          $addToSet: { profileViewers: new mongoose.Types.ObjectId(viewerId) },
        }),
        UserModel.findById(viewerId).select('blockedUsers'),
      ]);
      isBlockedByMe = !!me?.blockedUsers?.some(b => String(b) === userId);
    }

    return ok(res, { ...user.toObject(), isBlockedByMe });
  } catch (err) { next(err); }
});

export default router;
