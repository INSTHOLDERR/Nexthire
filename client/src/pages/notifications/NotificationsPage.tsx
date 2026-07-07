import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAllRead, markRead, Notification } from '../../services/socialService';
import { getSinglePost, toggleLike as togglePostLike, deletePost, Post } from '../../services/postService';
import { PostCard, EditPostModal, ReportModal, ReportsViewerModal } from '../home/HomePage';
import toast from 'react-hot-toast';

/** Populated post preview attached to a notification by the backend */
interface NotifPost { _id: string; title: string; description: string; media?: { url: string; type: string }[]; likes?: string[]; commentCount?: number; shareCount?: number; createdAt?: string }


const TYPE_ICON: Record<string, string> = {
  connection_request:  '🤝',
  connection_accepted: '✅',
  post_liked:          '❤️',
  post_commented:      '💬',
  comment_liked:       '👍',
  comment_replied:     '↩️',
  message:             '📩',
  post_suspended:      '⚠️',
  admin_note:          '📋',
  group_invite:        '👥',
  group_update:        '👥',
  warning:             '🚨',
};

const TYPE_COLOR: Record<string, string> = {
  connection_request:  'bg-blue-50 border-blue-100',
  connection_accepted: 'bg-emerald-50 border-emerald-100',
  post_liked:          'bg-red-50 border-red-100',
  post_commented:      'bg-purple-50 border-purple-100',
  comment_liked:       'bg-blue-50 border-blue-100',
  comment_replied:     'bg-indigo-50 border-indigo-100',
  message:             'bg-slate-50 border-slate-100',
  post_suspended:      'bg-amber-50 border-amber-100',
  admin_note:          'bg-slate-50 border-slate-100',
  group_invite:        'bg-indigo-50 border-indigo-100',
  group_update:        'bg-indigo-50 border-indigo-100',
  warning:             'bg-red-50 border-red-100',
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [popupPost, setPopupPost] = useState<Post | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [viewingReports, setViewingReports] = useState<Post | null>(null);

  const openPost = async (postId: string) => {
    setPopupLoading(true);
    try {
      const res = await getSinglePost(postId);
      setPopupPost(res.data.data);
    } catch { toast.error('Post not found or removed'); }
    finally { setPopupLoading(false); }
  };

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getNotifications(p);
      const d = res.data.data;
      setNotifications(d.notifications);
      setUnread(d.unread);
      setTotal(d.total);
      setPages(d.pages);
      setPage(p);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time notifications via socket
  useSocket({
    notification: (notif: unknown) => {
      const n = notif as Notification;
      setNotifications(prev => [n, ...prev]);
      setUnread(u => u + 1);
    },
  });

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    toast.success('All marked as read');
  };

  const handleRead = async (id: string) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {unread > 0 && <p className="text-sm text-slate-500 mt-0.5">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAll} className="text-sm font-semibold text-blue-600 hover:text-blue-800 px-4 py-2 hover:bg-blue-50 rounded-xl transition-colors">
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-slate-200 rounded-full w-2/3"/><div className="h-3 bg-slate-100 rounded-full w-1/2"/></div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="font-bold text-slate-800 text-lg mb-1">All caught up!</p>
            <p className="text-slate-400 text-sm">No notifications yet. Start connecting with people and sharing posts.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {notifications.map(n => {
                const from = n.fromUser;
                const fromName = from?.firstName ? `${from.firstName} ${from.lastName ?? ''}`.trim() : 'Someone';
                const icon = TYPE_ICON[n.type] ?? '🔔';
                const colorCls = TYPE_COLOR[n.type] ?? 'bg-slate-50 border-slate-100';
                return (
                  <button
                    key={n._id}
                    onClick={() => {
                      if (!n.read) handleRead(n._id);
                      // Navigate to the relevant content
                      const pid = n.postId ? (typeof n.postId === 'string' ? n.postId : (n.postId as any)._id) : null;
                      if (pid && ['post_liked','post_commented','comment_replied','comment_liked','post_suspended'].includes(n.type)) {
                        openPost(pid); // popup right here in the notifications page
                      } else if (n.fromUser && ['connection_request','connection_accepted'].includes(n.type)) {
                        navigate(`/profile/${typeof n.fromUser === 'string' ? n.fromUser : n.fromUser._id}`);
                      } else if (n.type === 'message' || n.type === 'group_invite' || n.type === 'group_update') {
                        navigate('/messages');
                      } else if (n.type === 'warning') {
                        navigate('/warnings');
                      }
                    }}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${n.read ? 'bg-white border-slate-200 opacity-75' : `${colorCls} shadow-sm`}`}
                  >
                    <div onClick={e => { e.stopPropagation(); from && navigate(`/profile/${from._id}`); }} className="flex-shrink-0 mt-0.5 cursor-pointer" title="View profile">
                      {from?.profilePicture
                        ? <img src={from.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-blue-300 transition-all"/>
                        : <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-blue-300 transition-all">
                            {(fromName[0] ?? '?').toUpperCase()}
                          </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">
                        <span
                          onClick={e => { e.stopPropagation(); from && navigate(`/profile/${from._id}`); }}
                          className={`font-semibold ${from ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                        >{fromName}</span>{' '}
                        <span className="text-slate-600">{n.message || `— ${n.type.replace(/_/g,' ')}`}</span>
                      </p>
                      {/* Post preview — click opens the post detail popup */}
                      {n.postId && typeof n.postId === 'object' && (() => {
                        const p2 = n.postId as unknown as NotifPost;
                        const thumb = p2.media?.find(m => m.type === 'image');
                        return (
                          <div
                            onClick={e => { e.stopPropagation(); if (!n.read) handleRead(n._id); openPost(p2._id); }}
                            className="mt-2 flex items-center gap-2.5 bg-white/70 border border-slate-200 rounded-xl px-3 py-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                            title="View post"
                          >
                            {thumb
                              ? <img src={thumb.url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"/>
                              : <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">📝</div>}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{p2.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">{p2.description}</p>
                            </div>
                            <svg className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <span className="text-lg flex-shrink-0">{icon}</span>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-400">{total} notifications</span>
                <div className="flex gap-1">
                  <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-100">←</button>
                  <span className="px-3 py-1.5 text-xs text-slate-500">{page}/{pages}</span>
                  <button onClick={() => load(page + 1)} disabled={page >= pages} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-100">→</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Post detail popup — full post experience (like, comments) right here */}
      {popupLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-xl text-sm font-semibold text-slate-600">Loading post…</div>
        </div>
      )}
      {popupPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPopupPost(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-900 text-base truncate pr-3">{popupPost.title}</h3>
              <button onClick={() => setPopupPost(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
            </div>
            <PostCard
              post={popupPost}
              currentUserId={user?.id ?? ''}
              onLike={async id => {
                setPopupPost(prev => prev ? { ...prev, likedByMe: !prev.likedByMe, likesCount: prev.likedByMe ? prev.likesCount - 1 : prev.likesCount + 1 } : null);
                try { await togglePostLike(id); } catch { /* revert silently */ }
              }}
              onDelete={async id => {
                if (!window.confirm('Delete this post permanently?')) return;
                try { await deletePost(id); toast.success('Post deleted'); } catch { toast.error('Could not delete'); }
                setPopupPost(null);
              }}
              onEdit={p => { setPopupPost(null); setEditingPost(p); }}
              onReport={p => setReportingPost(p)}
              onViewReports={p => setViewingReports(p)}
              onExpand={() => {}}
              onConnect={async () => {}}
            />
          </div>
        </div>
      )}

      {editingPost && (
        <EditPostModal post={editingPost} onClose={() => setEditingPost(null)} onSaved={() => { setEditingPost(null); toast.success('Post updated'); }} />
      )}
      {reportingPost && <ReportModal post={reportingPost} onClose={() => setReportingPost(null)} />}
      {viewingReports && <ReportsViewerModal post={viewingReports} onClose={() => setViewingReports(null)} />}
    </div>
  );
}
