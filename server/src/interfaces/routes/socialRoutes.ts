import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware';
import mongoose from 'mongoose';
import uploadService from '../../infrastructure/services/CloudinaryService';
import { WarningModel } from '../../infrastructure/database/models/WarningModel';
import { NotificationModel } from '../../infrastructure/database/models/SocialModels';
import { ConversationModel } from '../../infrastructure/database/models/SocialModels';
import { MessageModel } from '../../infrastructure/database/models/SocialModels';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { PostModel } from '../../infrastructure/database/models/PostModel';

const router = Router();
router.use(protect);

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const emit = (req: Request, room: string, event: string, data: unknown) =>
  req.app.locals.io?.to(room).emit(event, data);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const mediaTypeOf = (mime: string): 'image' | 'video' | 'audio' | 'file' =>
  mime.startsWith('image/') ? 'image'
  : mime.startsWith('video/') ? 'video'
  : mime.startsWith('audio/') ? 'audio'
  : 'file';

const cloudinaryTypeOf = (mime: string): 'image' | 'video' | 'raw' =>
  mime.startsWith('image/') ? 'image'
  : (mime.startsWith('video/') || mime.startsWith('audio/')) ? 'video' // cloudinary treats audio as video resource
  : 'raw';

// ─── Notifications ────────────────────────────────────────────────────────────

router.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = Number((req.query as any).page ?? 1);
    const limit = 20;
    const [docs, total, unread] = await Promise.all([
      NotificationModel.find({ userId })
        .populate('fromUser', '_id firstName lastName profilePicture headline')
        .populate('postId', '_id title description media likes commentCount shareCount createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      NotificationModel.countDocuments({ userId }),
      NotificationModel.countDocuments({ userId, read: false }),
    ]);
    ok(res, { notifications: docs, total, unread, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.patch('/notifications/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationModel.updateMany({ userId: req.user!.id, read: false }, { read: true });
    ok(res, { done: true });
  } catch (err) { next(err); }
});

router.patch('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationModel.findByIdAndUpdate(req.params.id, { read: true });
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// ─── Connections ──────────────────────────────────────────────────────────────

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await UserModel.findById(req.user!.id)
      .populate('connections', '_id firstName lastName profilePicture headline role workStatus')
      .populate('connectionRequests', '_id firstName lastName profilePicture headline role workStatus')
      .populate('pendingConnections', '_id firstName lastName profilePicture headline role workStatus');
    ok(res, {
      connections:        me?.connections ?? [],
      requests:           me?.connectionRequests ?? [],
      pending:            me?.pendingConnections ?? [],
    });
  } catch (err) { next(err); }
});

router.get('/connections/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await UserModel.findById(req.user!.id);
    const excluded = [
      req.user!.id,
      ...(me?.connections ?? []).map(String),
      ...(me?.pendingConnections ?? []).map(String),
      ...(me?.connectionRequests ?? []).map(String),
    ];
    const suggestions = await UserModel.find({
      _id: { $nin: excluded.map(id => new mongoose.Types.ObjectId(id)) },
      onboardingComplete: true,
    })
      .select('_id firstName lastName profilePicture headline role workStatus')
      .limit(10);
    ok(res, suggestions);
  } catch (err) { next(err); }
});

router.post('/connections/request/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { targetId } = req.params;
    if (myId === targetId) return ok(res, { done: true }); // can't connect to self

    await Promise.all([
      UserModel.findByIdAndUpdate(myId,     { $addToSet: { pendingConnections: targetId } }),
      UserModel.findByIdAndUpdate(targetId, { $addToSet: { connectionRequests: myId } }),
    ]);

    const me = await UserModel.findById(myId).select('firstName lastName profilePicture');
    const notif = await NotificationModel.create({
      userId: targetId, fromUser: myId,
      type: 'connection_request',
      message: `${me?.firstName ?? 'Someone'} sent you a connection request.`,
    });
    emit(req, `user:${targetId}`, 'notification', notif);

    ok(res, { done: true });
  } catch (err) { next(err); }
});

router.post('/connections/accept/:fromId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { fromId } = req.params;

    await Promise.all([
      UserModel.findByIdAndUpdate(myId,   { $pull: { connectionRequests: fromId }, $addToSet: { connections: fromId } }),
      UserModel.findByIdAndUpdate(fromId, { $pull: { pendingConnections: myId }, $addToSet: { connections: myId } }),
    ]);

    const me = await UserModel.findById(myId).select('firstName lastName profilePicture');
    const notif = await NotificationModel.create({
      userId: fromId, fromUser: myId,
      type: 'connection_accepted',
      message: `${me?.firstName ?? 'Someone'} accepted your connection request.`,
    });
    emit(req, `user:${fromId}`, 'notification', notif);

    ok(res, { done: true });
  } catch (err) { next(err); }
});

router.post('/connections/reject/:fromId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { fromId } = req.params;
    await Promise.all([
      UserModel.findByIdAndUpdate(myId,   { $pull: { connectionRequests: fromId } }),
      UserModel.findByIdAndUpdate(fromId, { $pull: { pendingConnections: myId } }),
    ]);
    ok(res, { done: true });
  } catch (err) { next(err); }
});

router.delete('/connections/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { targetId } = req.params;
    await Promise.all([
      UserModel.findByIdAndUpdate(myId,     { $pull: { connections: targetId } }),
      UserModel.findByIdAndUpdate(targetId, { $pull: { connections: myId } }),
    ]);
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// Connection status helper — used by post card "Connect" button
router.get('/connections/status/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await UserModel.findById(req.user!.id);
    const targetId = req.params.targetId;
    const isConnected = me?.connections?.some(id => String(id) === targetId);
    const isPending   = me?.pendingConnections?.some(id => String(id) === targetId);
    const isReceived  = me?.connectionRequests?.some(id => String(id) === targetId);
    ok(res, { status: isConnected ? 'connected' : isPending ? 'pending' : isReceived ? 'received' : 'none' });
  } catch (err) { next(err); }
});

// ─── Search ───────────────────────────────────────────────────────────────────

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String((req.query as any).q ?? '').trim();
    if (!q) return ok(res, { users: [], posts: [] });

    const regex = { $regex: q, $options: 'i' };
    const [users, posts] = await Promise.all([
      UserModel.find({
        onboardingComplete: true,
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { headline: regex }],
      }).select('_id firstName lastName profilePicture headline role workStatus').limit(10),
      PostModel.find({
        status: 'active', visibility: 'public',
        $or: [{ title: regex }, { description: regex }],
      }).populate('authorId', '_id firstName lastName profilePicture').sort({ createdAt: -1 }).limit(10),
    ]);
    ok(res, { users, posts });
  } catch (err) { next(err); }
});

// ─── Trending hashtags ────────────────────────────────────────────────────────

router.get('/trending', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const recent = await PostModel.find({ status: 'active', visibility: 'public' })
      .select('description title')
      .sort({ createdAt: -1 })
      .limit(200);

    const tagCounts: Record<string, number> = {};
    recent.forEach(p => {
      const text = `${p.title} ${p.description}`;
      const matches = text.match(/#\w+/g) ?? [];
      matches.forEach(tag => {
        const t = tag.toLowerCase();
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      });
    });

    const trending = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    ok(res, trending);
  } catch (err) { next(err); }
});

// ─── Messages ─────────────────────────────────────────────────────────────────

router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const convs = await ConversationModel.find({
      participants: myId,
      status: { $ne: 'ignored' },
    })
      .populate('participants', '_id firstName lastName profilePicture headline')
      .populate('pendingMembers', '_id firstName lastName profilePicture')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    // Group invites waiting for MY response
    const invites = await ConversationModel.find({ isGroup: true, pendingMembers: myId })
      .populate('participants', '_id firstName lastName profilePicture')
      .populate('requestedBy', '_id firstName lastName profilePicture')
      .sort({ createdAt: -1 });

    ok(res, { conversations: convs, groupInvites: invites });
  } catch (err) { next(err); }
});

router.post('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { targetId } = req.body as { targetId: string };

    // Check existing
    const existing = await ConversationModel.findOne({
      isGroup: { $ne: true },
      participants: { $all: [myId, targetId], $size: 2 },
    });
    if (existing) return ok(res, existing);

    const conv = await ConversationModel.create({
      participants: [myId, targetId],
      requestedBy: myId,
      status: 'pending',
    });

    const me = await UserModel.findById(myId).select('firstName lastName');
    const notif = await NotificationModel.create({
      userId: targetId, fromUser: myId,
      type: 'message',
      message: `${me?.firstName ?? 'Someone'} sent you a message request.`,
    });
    emit(req, `user:${targetId}`, 'notification', notif);
    emit(req, `user:${targetId}`, 'conversation_request', conv);

    ok(res, conv, 201);
  } catch (err) { next(err); }
});

router.patch('/conversations/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const found = await ConversationModel.findById(req.params.id);
    if (!found || String(found.requestedBy) === myId || !found.participants.some(p => String(p) === myId)) {
      return res.status(403).json({ success: false, message: 'Not allowed.' });
    }
    const conv = await ConversationModel.findByIdAndUpdate(
      req.params.id, { status: 'active' }, { new: true }
    );
    emit(req, `user:${conv?.requestedBy}`, 'conversation_accepted', conv);
    ok(res, conv);
  } catch (err) { next(err); }
});

router.patch('/conversations/:id/ignore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ConversationModel.findByIdAndDelete(req.params.id);
    ok(res, { done: true });
  } catch (err) { next(err); }
});

router.get('/conversations/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const conv = await ConversationModel.findById(req.params.id).select('participants');
    if (!conv || !conv.participants.some(p => String(p) === myId)) {
      return res.status(403).json({ success: false, message: 'Not a participant.' });
    }
    const page = Number((req.query as any).page ?? 1);
    const limit = 30;
    const [msgs, total] = await Promise.all([
      MessageModel.find({ conversationId: req.params.id })
        .populate('senderId', '_id firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MessageModel.countDocuments({ conversationId: req.params.id }),
    ]);
    // Mark as read
    await MessageModel.updateMany(
      { conversationId: req.params.id, senderId: { $ne: myId }, read: false },
      { read: true, $addToSet: { readBy: myId } }
    );
    await ConversationModel.findByIdAndUpdate(req.params.id, { $set: { [`unreadCount.${myId}`]: 0 } });
    ok(res, { messages: msgs.reverse(), total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.post('/conversations/:id/messages', upload.single('media'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const text = ((req.body?.text as string) ?? '').trim();
    const file = req.file;

    const conv = await ConversationModel.findById(req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (!conv.participants.some(p => String(p) === myId)) {
      return res.status(403).json({ success: false, message: 'Not a participant.' });
    }
    // Direct chats must be accepted; the requester may keep sending while pending
    // (WhatsApp-style: messages queue in the request until accepted).
    if (!conv.isGroup && conv.status === 'ignored') {
      return res.status(403).json({ success: false, message: 'Conversation not active.' });
    }
    if (!text && !file) return res.status(400).json({ success: false, message: 'Message is empty.' });

    let media: any = undefined;
    let type: string = 'text';
    if (file) {
      const uploaded = await uploadService.uploadMedia(file.buffer, 'nexthire/messages', cloudinaryTypeOf(file.mimetype));
      type = mediaTypeOf(file.mimetype);
      media = {
        url: uploaded.url, publicId: uploaded.publicId,
        originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
      };
    }

    const msg = await MessageModel.create({
      conversationId: req.params.id, senderId: myId, type, text, media, readBy: [myId],
    });

    const preview = text || (type === 'image' ? '📷 Photo' : type === 'video' ? '🎬 Video' : type === 'audio' ? '🎤 Voice message' : '📎 File');
    const inc: Record<string, unknown> = {};
    conv.participants.forEach(p => { if (String(p) !== myId) inc[`unreadCount.${p}`] = 1; });
    await ConversationModel.findByIdAndUpdate(req.params.id, {
      lastMessage: preview, lastMessageAt: new Date(), ...(Object.keys(inc).length ? { $inc: inc } : {}),
    });

    const populated = await MessageModel.findById(msg._id).populate('senderId', '_id firstName lastName profilePicture');

    // Emit to every other participant
    conv.participants.forEach(p => {
      if (String(p) !== myId) emit(req, `user:${p}`, 'new_message', { message: populated, conversationId: req.params.id });
    });

    ok(res, populated, 201);
  } catch (err) { next(err); }
});

// ─── Group chats ──────────────────────────────────────────────────────────────

// Create a group. Creator is a participant + admin; everyone else is invited
// (pendingMembers) and must accept before they join — like a group request.
router.post('/groups', upload.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const name = ((req.body?.name as string) ?? '').trim();
    let memberIds: string[] = [];
    try { memberIds = JSON.parse(req.body?.memberIds ?? '[]'); } catch {}
    memberIds = [...new Set(memberIds.filter(id => mongoose.Types.ObjectId.isValid(id) && id !== myId))];

    if (!name) return res.status(400).json({ success: false, message: 'Group name is required.' });
    if (memberIds.length < 1) return res.status(400).json({ success: false, message: 'Invite at least one member.' });

    let avatar = '', avatarPublicId = '';
    if (req.file && req.file.mimetype.startsWith('image/')) {
      const up = await uploadService.uploadMedia(req.file.buffer, 'nexthire/groups', 'image');
      avatar = up.url; avatarPublicId = up.publicId;
    }

    const conv = await ConversationModel.create({
      isGroup: true, name, avatar, avatarPublicId,
      participants: [myId], admins: [myId], pendingMembers: memberIds,
      requestedBy: myId, status: 'active',
    });

    const me = await UserModel.findById(myId).select('firstName lastName');
    for (const uid2 of memberIds) {
      const notif = await NotificationModel.create({
        userId: uid2, fromUser: myId, type: 'group_invite',
        message: `${me?.firstName ?? 'Someone'} invited you to the group "${name}".`,
      });
      emit(req, `user:${uid2}`, 'notification', notif);
      emit(req, `user:${uid2}`, 'group_invite', conv);
    }

    const populated = await ConversationModel.findById(conv._id)
      .populate('participants', '_id firstName lastName profilePicture')
      .populate('pendingMembers', '_id firstName lastName profilePicture');
    ok(res, populated, 201);
  } catch (err) { next(err); }
});

// Accept / decline a group invite
router.post('/groups/:id/respond', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { accept } = req.body as { accept: boolean };
    const conv = await ConversationModel.findById(req.params.id);
    if (!conv?.isGroup) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!conv.pendingMembers.some(p => String(p) === myId)) {
      return res.status(403).json({ success: false, message: 'No pending invite.' });
    }

    if (accept) {
      await ConversationModel.findByIdAndUpdate(req.params.id, {
        $pull: { pendingMembers: myId }, $addToSet: { participants: myId },
      });
      const me = await UserModel.findById(myId).select('firstName lastName');
      await MessageModel.create({
        conversationId: conv._id, senderId: myId, type: 'system',
        text: `${me?.firstName ?? 'A user'} joined the group`, readBy: [myId],
      });
      conv.participants.forEach(p => emit(req, `user:${p}`, 'group_update', { conversationId: String(conv._id) }));
    } else {
      await ConversationModel.findByIdAndUpdate(req.params.id, { $pull: { pendingMembers: myId } });
    }
    ok(res, { done: true });
  } catch (err) { next(err); }
});

const requireGroupAdmin = async (convId: string, myId: string) => {
  const conv = await ConversationModel.findById(convId);
  if (!conv?.isGroup) return { error: 'Group not found.', conv: null };
  if (!conv.admins.some(a => String(a) === myId)) return { error: 'Only group admins can do that.', conv: null };
  return { error: null, conv };
};

// Invite more members (admin only)
router.post('/groups/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { error, conv } = await requireGroupAdmin(req.params.id, myId);
    if (error || !conv) return res.status(403).json({ success: false, message: error });
    let memberIds: string[] = (req.body?.memberIds ?? []).filter((id: string) => mongoose.Types.ObjectId.isValid(id));
    memberIds = memberIds.filter(id =>
      !conv.participants.some(p => String(p) === id) && !conv.pendingMembers.some(p => String(p) === id));
    if (!memberIds.length) return res.status(400).json({ success: false, message: 'No new members to invite.' });

    await ConversationModel.findByIdAndUpdate(req.params.id, { $addToSet: { pendingMembers: { $each: memberIds } } });
    const me = await UserModel.findById(myId).select('firstName lastName');
    for (const uid2 of memberIds) {
      const notif = await NotificationModel.create({
        userId: uid2, fromUser: myId, type: 'group_invite',
        message: `${me?.firstName ?? 'Someone'} invited you to the group "${conv.name}".`,
      });
      emit(req, `user:${uid2}`, 'notification', notif);
    }
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// Remove a member (admin only)
router.delete('/groups/:id/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { error, conv } = await requireGroupAdmin(req.params.id, myId);
    if (error || !conv) return res.status(403).json({ success: false, message: error });
    const target = req.params.userId;
    if (target === myId) return res.status(400).json({ success: false, message: 'Use leave instead.' });

    await ConversationModel.findByIdAndUpdate(req.params.id, {
      $pull: { participants: target, admins: target, pendingMembers: target },
    });
    const removed = await UserModel.findById(target).select('firstName');
    await MessageModel.create({
      conversationId: conv._id, senderId: myId, type: 'system',
      text: `${removed?.firstName ?? 'A member'} was removed from the group`, readBy: [myId],
    });
    conv.participants.forEach(p => emit(req, `user:${p}`, 'group_update', { conversationId: String(conv._id) }));
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// Promote / demote a moderator (admin only)
router.patch('/groups/:id/admins/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { promote } = req.body as { promote: boolean };
    const { error, conv } = await requireGroupAdmin(req.params.id, myId);
    if (error || !conv) return res.status(403).json({ success: false, message: error });
    const target = req.params.userId;
    if (!conv.participants.some(p => String(p) === target)) {
      return res.status(400).json({ success: false, message: 'Not a group member.' });
    }
    await ConversationModel.findByIdAndUpdate(req.params.id,
      promote ? { $addToSet: { admins: target } } : { $pull: { admins: target } });
    conv.participants.forEach(p => emit(req, `user:${p}`, 'group_update', { conversationId: String(conv._id) }));
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// Rename group (admin only)
router.patch('/groups/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const name = ((req.body?.name as string) ?? '').trim();
    const { error, conv } = await requireGroupAdmin(req.params.id, myId);
    if (error || !conv) return res.status(403).json({ success: false, message: error });
    if (!name) return res.status(400).json({ success: false, message: 'Name required.' });
    await ConversationModel.findByIdAndUpdate(req.params.id, { name });
    conv.participants.forEach(p => emit(req, `user:${p}`, 'group_update', { conversationId: String(conv._id) }));
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// Leave group
router.post('/groups/:id/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const conv = await ConversationModel.findById(req.params.id);
    if (!conv?.isGroup || !conv.participants.some(p => String(p) === myId)) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }
    await ConversationModel.findByIdAndUpdate(req.params.id, { $pull: { participants: myId, admins: myId } });
    const me = await UserModel.findById(myId).select('firstName');
    await MessageModel.create({
      conversationId: conv._id, senderId: myId, type: 'system',
      text: `${me?.firstName ?? 'A member'} left the group`, readBy: [myId],
    });
    // If no admins remain, promote the longest-standing participant
    const fresh = await ConversationModel.findById(req.params.id);
    if (fresh && fresh.isGroup && fresh.admins.length === 0 && fresh.participants.length > 0) {
      await ConversationModel.findByIdAndUpdate(req.params.id, { $addToSet: { admins: fresh.participants[0] } });
    }
    conv.participants.forEach(p => emit(req, `user:${p}`, 'group_update', { conversationId: String(conv._id) }));
    ok(res, { done: true });
  } catch (err) { next(err); }
});

// ─── Warnings (user side) ─────────────────────────────────────────────────────

// ─── Reports against me ──────────────────────────────────────────────────────
// The reported user (or reported post's owner) can see reports made against
// them — WITHOUT the reporter's identity or evidence — and add one response
// (their side of the story) that admins will see before taking action.

router.get('/reports-against-me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');

    const myPostIds = await PostModel.find({ authorId: myId }).distinct('_id');
    const docs = await ReportModel.find({
      $or: [
        { targetType: 'user', targetUserId: myId },
        { targetType: 'post', postId: { $in: myPostIds } },
      ],
    })
      .populate('postId', '_id title')
      .sort({ createdAt: -1 });

    // Strip everything that could identify the reporter
    const safe = docs.map((r: any) => ({
      _id: r._id,
      targetType: r.targetType,
      post: r.postId ? { _id: r.postId._id, title: r.postId.title } : null,
      reason: r.reason,
      description: r.description,
      status: r.status,
      adminNote: r.adminNote,
      targetResponse: r.targetResponse,
      targetRespondedAt: r.targetRespondedAt,
      createdAt: r.createdAt,
    }));
    ok(res, safe);
  } catch (err) { next(err); }
});

// Respond to a report made against me / my post (editable while still pending)
router.post('/reports/:id/respond', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const response = ((req.body?.response as string) ?? '').trim();
    if (!response) return res.status(400).json({ success: false, message: 'Please write your response.' });

    const { ReportModel, PostModel } = await import('../../infrastructure/database/models/PostModel');
    const report: any = await ReportModel.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    // Am I the target?
    let isTarget = report.targetType === 'user' && String(report.targetUserId) === myId;
    if (!isTarget && report.targetType === 'post' && report.postId) {
      const post: any = await PostModel.findById(report.postId).select('authorId');
      isTarget = post && String(post.authorId) === myId;
    }
    if (!isTarget) return res.status(403).json({ success: false, message: 'Not your report to respond to.' });
    if (report.status === 'resolved') {
      return res.status(409).json({ success: false, message: 'This report was already resolved by the moderation team.' });
    }

    report.targetResponse = response.slice(0, 2000);
    report.targetRespondedAt = new Date();
    await report.save();
    ok(res, { done: true });
  } catch (err) { next(err); }
});


router.get('/my-warnings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const docs = await WarningModel.find({ userId: req.user!.id })
      .populate('postId', '_id title')
      .sort({ createdAt: -1 });
    ok(res, docs);
  } catch (err) { next(err); }
});

// Appeal a warning (one appeal per warning)
router.post('/my-warnings/:id/appeal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const explanation = ((req.body?.explanation as string) ?? '').trim();
    if (!explanation) return res.status(400).json({ success: false, message: 'An explanation is required.' });
    const warning = await WarningModel.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!warning) return res.status(404).json({ success: false, message: 'Warning not found.' });
    if (warning.appealStatus !== 'none') {
      return res.status(409).json({ success: false, message: 'You already appealed this warning.' });
    }
    warning.appealText = explanation.slice(0, 2000);
    warning.appealStatus = 'pending';
    warning.status = 'appealed';
    await warning.save();
    ok(res, warning);
  } catch (err) { next(err); }
});

// ─── User-to-user reports ─────────────────────────────────────────────────────

const VALID_REPORT_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other'];

router.post('/report-user/:targetId', upload.array('evidence', 3), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const myId = req.user!.id;
    const { targetId } = req.params;
    const { reason, description } = req.body as { reason: string; description?: string };

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    if (targetId === myId) {
      return res.status(400).json({ success: false, message: 'You cannot report yourself.' });
    }
    if (!reason || !VALID_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: 'A valid reason is required.' });
    }

    const target = await UserModel.findById(targetId).select('_id');
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    const { ReportModel } = await import('../../infrastructure/database/models/PostModel');

    // Prevent duplicate pending reports from the same reporter on the same user
    const existing = await ReportModel.findOne({
      targetType: 'user', targetUserId: targetId, reportedBy: myId, status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a pending report on this user.' });
    }

    // Upload evidence images (optional, max 3)
    const evidenceUrls: string[] = [];
    const files = (req.files as Express.Multer.File[]) ?? [];
    for (const f of files.filter(f => f.mimetype.startsWith('image/')).slice(0, 3)) {
      const up = await uploadService.uploadMedia(f.buffer, 'nexthire/report-evidence', 'image');
      evidenceUrls.push(up.url);
    }

    const report = await ReportModel.create({
      targetType:   'user',
      targetUserId: targetId,
      reportedBy:   myId,
      reason,
      description:  description?.slice(0, 2000),
      evidenceUrls,
    });

    // Tell the reported user (WITHOUT revealing who reported) so they can respond.
    try {
      const n = await NotificationModel.create({
        userId: targetId, type: 'admin_note',
        message: 'Your account received a report. You can view it and add your response in Reports → Against me.',
      });
      emit(req, `user:${targetId}`, 'notification', n);
    } catch { /* best-effort */ }

    return ok(res, report, 201);
  } catch (err) { next(err); }
});

// ─── Get reports submitted by this user (for their navbar Reports page) ────────

router.get('/my-reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ReportModel = (await import('../../infrastructure/database/models/PostModel')).ReportModel;
    const page = Number((req.query as any).page ?? 1);
    const limit = 20;
    const [docs, total] = await Promise.all([
      ReportModel.find({ reportedBy: req.user!.id })
        .populate('postId', '_id title')
        .populate('targetUserId', '_id firstName lastName profilePicture headline')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReportModel.countDocuments({ reportedBy: req.user!.id }),
    ]);
    ok(res, { reports: docs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ─── Reports received on my posts ─────────────────────────────────────────────

router.get('/reports-on-my-posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const PostModel = (await import('../../infrastructure/database/models/PostModel')).PostModel;
    const ReportModel = (await import('../../infrastructure/database/models/PostModel')).ReportModel;
    const myPosts = await PostModel.find({ authorId: req.user!.id }).select('_id');
    const postIds = myPosts.map(p => p._id);
    const page = Number((req.query as any).page ?? 1);
    const limit = 20;
    const [docs, total] = await Promise.all([
      ReportModel.find({ postId: { $in: postIds } })
        .populate('postId', '_id title')
        .populate('reportedBy', '_id firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReportModel.countDocuments({ postId: { $in: postIds } }),
    ]);
    ok(res, { reports: docs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

export default router;
