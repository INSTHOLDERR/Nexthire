import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserStub {
  _id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  headline?: string;
  role?: string;
  workStatus?: string;
}

export interface Notification {
  _id: string;
  type: string;
  fromUser?: UserStub;
  postId?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: UserStub[];
  status: 'pending' | 'active' | 'ignored';
  requestedBy: string | UserStub;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  // group fields
  isGroup?: boolean;
  name?: string;
  avatar?: string;
  admins?: string[];
  pendingMembers?: UserStub[];
  createdAt?: string;
}

export interface MessageMedia { url: string; publicId?: string; originalName?: string; mimeType?: string; sizeBytes?: number }

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | UserStub;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  text: string;
  media?: MessageMedia;
  read: boolean;
  createdAt: string;
}

export interface Warning {
  _id: string;
  reason: string;
  note?: string;
  status: 'active' | 'appealed' | 'revoked';
  appealStatus: 'none' | 'pending' | 'approved' | 'rejected';
  appealText?: string;
  appealAdminNote?: string;
  postId?: { _id: string; title: string } | null;
  createdAt: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications  = (page = 1)   => api.get('/social/notifications', { params: { page } });
export const markAllRead       = ()            => api.patch('/social/notifications/read-all');
export const markRead          = (id: string)  => api.patch(`/social/notifications/${id}/read`);

// ── Connections ───────────────────────────────────────────────────────────────
export const getConnections    = ()            => api.get('/social/connections');
export const getSuggestions    = ()            => api.get('/social/connections/suggestions');
export const sendRequest       = (id: string)  => api.post(`/social/connections/request/${id}`);
export const acceptRequest     = (id: string)  => api.post(`/social/connections/accept/${id}`);
export const rejectRequest     = (id: string)  => api.post(`/social/connections/reject/${id}`);
export const removeConnection  = (id: string)  => api.delete(`/social/connections/${id}`);
export const getConnectionStatus = (id: string)=> api.get(`/social/connections/status/${id}`);

// ── Search ────────────────────────────────────────────────────────────────────
export const search = (q: string) => api.get('/social/search', { params: { q } });

// ── Trending ──────────────────────────────────────────────────────────────────
export const getTrending = () => api.get('/social/trending');

// ── Messages ──────────────────────────────────────────────────────────────────
export const getConversations  = ()            => api.get('/social/conversations');
export const startConversation = (targetId: string) => api.post('/social/conversations', { targetId });
export const acceptConversation= (id: string)  => api.patch(`/social/conversations/${id}/accept`);
export const ignoreConversation= (id: string)  => api.patch(`/social/conversations/${id}/ignore`);
export const getMessages       = (id: string, page = 1) => api.get(`/social/conversations/${id}/messages`, { params: { page } });
export const sendMessage       = (id: string, text: string) => api.post(`/social/conversations/${id}/messages`, { text });
export const sendMediaMessage  = (id: string, file: File | Blob, text = '', fileName?: string) => {
  const fd = new FormData();
  fd.append('media', file, fileName ?? (file as File).name ?? 'file');
  if (text) fd.append('text', text);
  return api.post(`/social/conversations/${id}/messages`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// ── Groups ────────────────────────────────────────────────────────────────────
export const createGroup       = (name: string, memberIds: string[], avatar?: File) => {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('memberIds', JSON.stringify(memberIds));
  if (avatar) fd.append('avatar', avatar);
  return api.post('/social/groups', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const respondGroupInvite = (id: string, accept: boolean) => api.post(`/social/groups/${id}/respond`, { accept });
export const addGroupMembers    = (id: string, memberIds: string[]) => api.post(`/social/groups/${id}/members`, { memberIds });
export const removeGroupMember  = (id: string, userId: string) => api.delete(`/social/groups/${id}/members/${userId}`);
export const setGroupAdmin      = (id: string, userId: string, promote: boolean) => api.patch(`/social/groups/${id}/admins/${userId}`, { promote });
export const renameGroup        = (id: string, name: string) => api.patch(`/social/groups/${id}`, { name });
export const leaveGroup         = (id: string) => api.post(`/social/groups/${id}/leave`);

// ── Warnings ──────────────────────────────────────────────────────────────────
export const getMyWarnings  = () => api.get('/social/my-warnings');
export const appealWarning  = (id: string, explanation: string) => api.post(`/social/my-warnings/${id}/appeal`, { explanation });

// ── Reports against me ────────────────────────────────────────────────────────
export interface ReportAgainstMe {
  _id: string;
  targetType: 'post' | 'user';
  post?: { _id: string; title: string } | null;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  adminNote?: string;
  targetResponse?: string;
  targetRespondedAt?: string;
  createdAt: string;
}
export const getReportsAgainstMe = () => api.get('/social/reports-against-me');
export const respondToReport     = (id: string, response: string) => api.post(`/social/reports/${id}/respond`, { response });