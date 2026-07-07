import NHLogo from '../../components/common/NHLogo';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSocket } from '../../hooks/useSocket';
import { getUsers, setStatus, getAppeals, reviewAppeal } from '../../services/adminService';
import { AdminUser, AdminAppeal, AdminAction, AppealStatus, UserStatus } from '../../types';
import { DashboardPanel, PostsPanel, AdminStats, UserDetailDrawer, UsersReviewQueue } from './ModerationPanels';
import { getAdminStats } from '../../services/adminService';
import type { AxiosError } from 'axios';

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50  text-amber-700  border-amber-200',
  banned:    'bg-red-50    text-red-700    border-red-200',
};
const APPEAL_BADGE: Record<AppealStatus, string> = {
  pending:  'bg-slate-100  text-slate-600  border-slate-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50     text-red-600    border-red-200',
};

const Sk = ({ c }: { c: string }) => <div className={`animate-pulse bg-slate-200 rounded-lg ${c}`} />;

// ─── Appeal Review Side Panel ─────────────────────────────────────────────────
interface AppealPanelProps {
  appeal: AdminAppeal;
  onClose: () => void;
  onReviewed: (id: string, status: AppealStatus) => void;
}

function AppealPanel({ appeal, onClose, onReviewed }: AppealPanelProps) {
  const [msg,      setMsg]      = useState('');
  const [acting,   setActing]   = useState<'approved' | 'rejected' | ''>('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const user      = appeal.userId;
  const name      = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || '—';
  const fmt       = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isPending = appeal.status === 'pending';

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!msg.trim()) return toast.error('Please write a message to the user first');
    setActing(status);
    try {
      await reviewAppeal(appeal._id, { status, adminMsg: msg.trim() });
      toast.success(status === 'approved' ? '✅ Appeal approved — user activated & email sent' : '❌ Appeal rejected — email sent');
      onReviewed(appeal._id, status);
    } catch (err) {
      toast.error((err as AxiosError<{ message?: string }>).response?.data?.message || 'Failed');
    } finally { setActing(''); }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="w-full sm:w-[520px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              {user?.profilePicture
                ? <img src={user.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                : <div className="w-9 h-9 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">{(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}</div>
              }
              <div><p className="text-slate-900 font-semibold text-sm">{name}</p><p className="text-slate-400 text-xs">{user?.email}</p></div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${appeal.type === 'ban' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{appeal.type === 'ban' ? 'Ban Appeal' : 'Suspension Appeal'}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGE[user?.status] || ''}`}>User: {user?.status}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${APPEAL_BADGE[appeal.status]}`}>{appeal.status}</span>
              <span className="text-slate-400 text-xs self-center ml-auto">{fmt(appeal.createdAt)}</span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">User's Explanation</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{appeal.explanation}</p></div>
            </div>

            {appeal.evidence?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Evidence ({appeal.evidence.length} file{appeal.evidence.length > 1 ? 's' : ''})</p>
                <div className="grid grid-cols-2 gap-2">
                  {appeal.evidence.map((url, i) => (
                    <button key={i} onClick={() => setLightbox(url)} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video hover:border-slate-400 transition-colors">
                      <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                        <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
                      </div>
                      <a href={url} target="_blank" rel="noreferrer" className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>Open</a>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isPending && (
              <div className={`rounded-xl p-4 flex items-center gap-3 ${appeal.status === 'approved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                {appeal.status === 'approved'
                  ? <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  : <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
                <p className={`text-sm font-medium ${appeal.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>{appeal.status === 'approved' ? 'Approved — user account has been activated' : 'This appeal was rejected'}</p>
              </div>
            )}

            {isPending && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message to User <span className="text-red-400">*</span><span className="normal-case font-normal text-slate-400 ml-1">(sent by email when you decide)</span></p>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="Write your message to the user — explain your decision clearly…" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all placeholder-slate-400 resize-none shadow-sm" />
                {!msg.trim() && <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>A message is required before approving or rejecting</p>}
              </div>
            )}
          </div>

          {isPending && (
            <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
              <button onClick={() => handleDecision('rejected')} disabled={!!acting || !msg.trim()} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                {acting === 'rejected' ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Rejecting...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>Reject</>}
              </button>
              <button onClick={() => handleDecision('approved')} disabled={!!acting || !msg.trim()} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                {acting === 'approved' ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Approving...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Approve &amp; Activate</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <img src={lightbox} alt="Evidence" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
interface ModalState { user: AdminUser; action: AdminAction }

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab,         setTab]         = useState<'dashboard' | 'users' | 'appeals' | 'reports' | 'warnings' | 'posts'>('dashboard');
  const [stats,       setStats]       = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [navSearch,   setNavSearch]   = useState('');
  const [showBell,    setShowBell]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [queueRefresh, setQueueRefresh] = useState(0);

  const loadStats = useCallback(async () => {
    try { const res = await getAdminStats(); setStats(res.data.data); }
    catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, []);
  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [appeals,     setAppeals]     = useState<AdminAppeal[]>([]);
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const PAGE_SIZE = 10;
  const [usersLoading,   setUsersLoading]   = useState(true);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [modal,       setModal]       = useState<ModalState | null>(null);
  const [panel,       setPanel]       = useState<AdminAppeal | null>(null);
  const [reason,      setReason]      = useState('');
  const [suspendDays, setSuspendDays] = useState('7');
  const [acting,      setActing]      = useState(false);
  const [appealStatusFilter, setAppealStatusFilter] = useState('');
  const [appealTypeFilter,   setAppealTypeFilter]   = useState('');
  const [appealPage,         setAppealPage]         = useState(1);
  const [appealTotalPages,   setAppealTotalPages]   = useState(1);
  const [appealTotal,        setAppealTotal]        = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const logout = () => { localStorage.removeItem('nh_admin_token'); navigate('/admin'); };

  const loadUsers = useCallback(async (opts: { q?: string; status?: string; role?: string; p?: number } = {}) => {
    setUsersLoading(true);
    try {
      const res = await getUsers({
        search: opts.q      !== undefined ? opts.q      : search,
        status: opts.status !== undefined ? opts.status : (statusFilter || undefined),
        role:   opts.role   !== undefined ? opts.role   : (roleFilter   || undefined),
        page:   opts.p      !== undefined ? opts.p      : page,
        limit:  PAGE_SIZE,
      });
      const data = res.data.data;
      setUsers(data.users as AdminUser[]);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      if ((err as AxiosError).response?.status === 401) { toast.error('Session expired'); logout(); }
    } finally { setUsersLoading(false); }
  }, [search, statusFilter, roleFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAppeals = useCallback(async (opts: { status?: string; type?: string; p?: number } = {}) => {
    setAppealsLoading(true);
    try {
      const res = await getAppeals({
        status: opts.status !== undefined ? opts.status : (appealStatusFilter || undefined),
        type:   opts.type   !== undefined ? opts.type   : (appealTypeFilter   || undefined),
        page:   opts.p      !== undefined ? opts.p      : appealPage,
        limit:  PAGE_SIZE,
      });
      const data = res.data.data;
      setAppeals(data.appeals as AdminAppeal[]);
      setAppealTotal(data.total);
      setAppealTotalPages(data.pages);
    } catch { toast.error('Failed to load appeals'); }
    finally { setAppealsLoading(false); }
  }, [appealStatusFilter, appealTypeFilter, appealPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!localStorage.getItem('nh_admin_token')) { navigate('/admin'); return; }
    if (tab === 'dashboard') loadStats();
    if (tab === 'users') loadUsers({ p: 1 });
    if (tab === 'appeals') loadAppeals({ p: 1 });
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadStats(); }, [loadStats]); // navbar bell badge on first load

  useEffect(() => {
    if (tab === 'appeals') loadAppeals({ p: 1 });
  }, [appealStatusFilter, appealTypeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_admin');

    socket.on('new_appeal', (appeal: AdminAppeal) => {
      setAppeals(prev => [appeal, ...prev]);
      loadStats();
      toast('📋 New appeal received', { icon: '🔔', duration: 5000 });
    });
    socket.on('appeal_updated', ({ appealId, status }: { appealId: string; status: AppealStatus }) => {
      setAppeals(prev => prev.map(a => String(a._id) === String(appealId) ? { ...a, status } : a));
    });
    socket.on('user_status_changed', ({ userId, status }: { userId: string; status: string }) => {
      setUsers(prev => prev.map(u => String(u._id) === String(userId) ? { ...u, status: status as AdminUser['status'] } : u));
    });

    return () => {
      socket.off('new_appeal');
      socket.off('appeal_updated');
      socket.off('user_status_changed');
    };
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadUsers({ q: val, p: 1 }), 300);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setPage(1);
    loadUsers({ status: val, p: 1 });
  };

  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(1);
    loadUsers({ role: val, p: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadUsers({ p: newPage });
  };

  const openModal = (user: AdminUser, action: AdminAction) => { setModal({ user, action }); setReason(''); setSuspendDays('7'); };

  const handleAction = async () => {
    if (!modal) return;
    setActing(true);
    try {
      await setStatus(modal.user._id, { action: modal.action, reason, suspendDays });
      toast.success(({ ban: 'Banned', suspend: 'Suspended', activate: 'Activated' }[modal.action]) + ' — email sent');
      setModal(null);
    } catch (err) { toast.error((err as AxiosError<{ message?: string }>).response?.data?.message || 'Failed'); }
    finally { setActing(false); }
  };

  const handleReviewed = (appealId: string, status: AppealStatus) => {
    setAppeals(prev => prev.map(a => String(a._id) === String(appealId) ? { ...a, status } : a));
    setPanel(null);
  };

  const avatar  = (u: AdminUser) => (u?.firstName?.[0] || u?.email?.[0] || '?').toUpperCase();
  const pending = appeals.filter(a => a.status === 'pending').length;
  const fmt     = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const bellCount = (stats?.reports.pending ?? 0) + (stats?.appeals.pending ?? 0) + (stats?.warnings.appealsPending ?? 0);

  const runNavSearch = () => {
    setTab('users');
    setSearch(navSearch);
    setPage(1);
    loadUsers({ q: navSearch, p: 1 });
    setSidebarOpen(false);
  };

  const NAV_ITEMS: { id: typeof tab; label: string; icon: JSX.Element; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
    { id: 'users',     label: 'Users',     badge: (stats?.reports.pendingUser ?? 0) + (stats?.appeals.pending ?? 0) + (stats?.warnings.appealsPending ?? 0), icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg> },
    { id: 'posts',     label: 'Posts',     badge: stats?.reports.pendingPost, icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg> },
  ];


  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top navbar: logo · search · notifications · logout ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button onClick={() => setSidebarOpen(o => !o)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 cursor-pointer" onClick={() => setTab('dashboard')}>
            <NHLogo size={28} />
            <span className="font-bold text-slate-800 text-sm sm:text-base hidden sm:inline">NextHire <span className="text-slate-400 font-normal">Admin</span></span>
          </div>

          {/* Global user search */}
          <div className="flex-1 max-w-md mx-auto relative">
            <svg className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runNavSearch(); }}
              placeholder="Search users by name or email…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Notifications bell */}
            <div className="relative">
              <button onClick={() => setShowBell(b => !b)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 relative cursor-pointer" title="Pending moderation">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                {bellCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{bellCount > 99 ? '99+' : bellCount}</span>}
              </button>
              {showBell && (
                <div className="absolute right-0 top-11 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <p className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100">Needs review</p>
                  {bellCount === 0 ? (
                    <p className="px-4 py-5 text-sm text-slate-400 text-center">All clear — nothing pending 🎉</p>
                  ) : (
                    <>
                      {(stats?.reports.pendingPost ?? 0) > 0 && (
                        <button onClick={() => { setTab('posts'); setShowBell(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left cursor-pointer">
                          <span className="text-lg">🚩</span>
                          <span className="text-sm font-semibold text-slate-700 flex-1">{stats!.reports.pendingPost} post report{stats!.reports.pendingPost > 1 ? 's' : ''}</span>
                          <span className="text-slate-300">→ Posts</span>
                        </button>
                      )}
                      {(stats?.reports.pendingUser ?? 0) > 0 && (
                        <button onClick={() => { setTab('users'); setShowBell(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left cursor-pointer">
                          <span className="text-lg">👤</span>
                          <span className="text-sm font-semibold text-slate-700 flex-1">{stats!.reports.pendingUser} user report{stats!.reports.pendingUser > 1 ? 's' : ''}</span>
                          <span className="text-slate-300">→ Users</span>
                        </button>
                      )}
                      {(stats?.appeals.pending ?? 0) > 0 && (
                        <button onClick={() => { setTab('users'); setShowBell(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left cursor-pointer">
                          <span className="text-lg">⚖️</span>
                          <span className="text-sm font-semibold text-slate-700 flex-1">{stats!.appeals.pending} account appeal{stats!.appeals.pending > 1 ? 's' : ''}</span>
                          <span className="text-slate-300">→ Users</span>
                        </button>
                      )}
                      {(stats?.warnings.appealsPending ?? 0) > 0 && (
                        <button onClick={() => { setTab('users'); setShowBell(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left cursor-pointer">
                          <span className="text-lg">⚠️</span>
                          <span className="text-sm font-semibold text-slate-700 flex-1">{stats!.warnings.appealsPending} warning appeal{stats!.warnings.appealsPending > 1 ? 's' : ''}</span>
                          <span className="text-slate-300">→ Users</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse hidden sm:block" title="Live — socket connected" />
            <button onClick={logout} className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 text-sm font-medium transition-colors px-2 py-1.5 rounded-xl hover:bg-red-50 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Left sidebar ── */}
        <aside className={`${sidebarOpen ? 'flex' : 'hidden'} lg:flex flex-col w-60 flex-shrink-0 bg-white border-r border-slate-200 fixed lg:sticky top-14 sm:top-16 z-30 h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] overflow-y-auto`}>
          <nav className="p-3 space-y-1 flex-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setSidebarOpen(false); if (item.id === 'dashboard') loadStats(); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  tab === item.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {item.icon}
                {item.label}
                {(item.badge ?? 0) > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab === item.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-500">Roles:</span> 🙋 User (default) · 💼 Job seeker (open to work) · 🏢 Recruiter (hiring)
            </p>
          </div>
        </aside>
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)}/>}

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6">
          {tab === 'dashboard' && <DashboardPanel stats={stats} loading={statsLoading} onGo={s2 => {
            // Reports/appeals/warnings live inside the Users & Posts sections now
            const target = s2 === 'reports' ? 'posts' : (s2 === 'appeals' || s2 === 'warnings') ? 'users' : s2;
            setTab(target as typeof tab);
          }} />}

        {tab === 'posts' && <PostsPanel />}

        {tab === 'users' && (
          <div>
          <UsersReviewQueue onOpenUser={setDrawerUserId} refreshKey={queueRefresh} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Filter bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">All Users</h2>
                  {!usersLoading && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{total} total</span>}
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
                  <input value={search} onChange={handleSearch} placeholder="Search name or email…" className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 w-full sm:w-64" />
                </div>
              </div>
              {/* Filter row */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={e => handleStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
                <select
                  value={roleFilter}
                  onChange={e => handleRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">All roles</option>
                  <option value="user">🙋 User</option>
                  <option value="jobseeker">💼 Job Seeker</option>
                  <option value="recruiter">🏢 Recruiter</option>
                </select>
              </div>
            </div>

            {usersLoading ? (
              <div className="divide-y divide-slate-100">{Array(5).fill(0).map((_, i) => (<div key={i} className="px-5 py-4 flex items-center gap-4"><Sk c="w-9 h-9 !rounded-full flex-shrink-0" /><Sk c="h-4 w-32" /><Sk c="h-4 w-44 ml-2" /><Sk c="h-5 w-20 !rounded-full ml-auto" /><Sk c="h-7 w-16" /><Sk c="h-7 w-12" /></div>))}</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No users found</div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 border-b border-slate-100">{['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(user => (
                        <tr key={user._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setDrawerUserId(user._id)} title="Open user details — reports, warnings, appeals">
                              {user.profilePicture ? <img src={user.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-200 transition-all" /> : <div className="w-9 h-9 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-200 transition-all">{avatar(user)}</div>}
                              <span className="text-slate-800 font-medium truncate max-w-[120px] group-hover:text-blue-600 transition-colors">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : <span className="text-slate-400">—</span>}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-xs truncate max-w-[160px]">{user.email}</td>
                          <td className="px-5 py-4">
                            {user.role ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${user.role === 'recruiter' ? 'bg-purple-50 text-purple-700 border-purple-200' : user.role === 'jobseeker' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{user.role === 'recruiter' ? '🏢 ' : user.role === 'jobseeker' ? '💼 ' : '🙋 '}{user.role}</span> : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-5 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[user.status]}`}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
                          <td className="px-5 py-4 text-slate-400 text-xs">{fmt(user.createdAt)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {user.status === UserStatus.ACTIVE && <><button onClick={() => openModal(user, 'suspend')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-colors">Suspend</button><button onClick={() => openModal(user, 'ban')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors">Ban</button></>}
                              {user.status === UserStatus.SUSPENDED && <><button onClick={() => openModal(user, 'activate')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors">Activate</button><button onClick={() => openModal(user, 'ban')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors">Ban</button></>}
                              {user.status === UserStatus.BANNED && <button onClick={() => openModal(user, 'activate')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors">Unban</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-slate-100">
                  {users.map(user => (
                    <div key={user._id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setDrawerUserId(user._id)}>
                          {user.profilePicture ? <img src={user.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" /> : <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold">{avatar(user)}</div>}
                          <div><p className="text-slate-800 font-medium text-sm">{user.firstName || <span className="text-slate-400">—</span>}</p><p className="text-slate-400 text-xs">{user.email}</p></div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[user.status]}`}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                      </div>
                      <div className="flex gap-2">
                        {user.status === UserStatus.ACTIVE && <><button onClick={() => openModal(user, 'suspend')} className="flex-1 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold">Suspend</button><button onClick={() => openModal(user, 'ban')} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">Ban</button></>}
                        {user.status === UserStatus.SUSPENDED && <><button onClick={() => openModal(user, 'activate')} className="flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">Activate</button><button onClick={() => openModal(user, 'ban')} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">Ban</button></>}
                        {user.status === UserStatus.BANNED && <button onClick={() => openModal(user, 'activate')} className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">Unban</button>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination — always shown */}
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Page {page} of {totalPages} · {total} users</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                      >← Prev</button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${p === page ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
                          >{p}</button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                      >Next →</button>
                    </div>
                  </div>
              </>
            )}
          </div>
          </div>
        )}

        {tab === 'appeals' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="font-semibold text-slate-800">User Appeals</h2><p className="text-slate-400 text-xs mt-0.5">New appeals appear instantly · Click any appeal to review</p></div>
              {pending > 0 && <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">{pending} pending</span>}
            </div>

            {/* Appeal Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={appealStatusFilter}
                onChange={e => { setAppealStatusFilter(e.target.value); setAppealPage(1); }}
                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={appealTypeFilter}
                onChange={e => { setAppealTypeFilter(e.target.value); setAppealPage(1); }}
                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">All types</option>
                <option value="suspension">Suspension</option>
                <option value="ban">Ban</option>
              </select>
              <span className="ml-auto text-xs text-slate-400 self-center">{appealTotal} total</span>
            </div>

            {appealsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => (<div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4"><Sk c="w-11 h-11 !rounded-full flex-shrink-0" /><div className="flex-1 space-y-2"><Sk c="h-4 w-36" /><Sk c="h-3 w-60" /><Sk c="h-3 w-44" /></div><Sk c="h-6 w-16 !rounded-full flex-shrink-0" /></div>))}</div>
            ) : appeals.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm"><p className="text-slate-400 text-sm">{appealStatusFilter || appealTypeFilter ? 'No appeals match these filters.' : 'No appeals yet'}</p></div>
            ) : (
              <div className="space-y-3">
                {appeals.map(appeal => {
                  const user = appeal.userId;
                  const name = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || '—';
                  return (
                    <button key={appeal._id} onClick={() => setPanel(appeal)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all text-left group">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {user?.profilePicture ? <img src={user.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0" /> : <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{(user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}</div>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-slate-800 font-semibold text-sm">{name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold hidden sm:inline-flex ${STATUS_BADGE[user?.status] || ''}`}>{user?.status}</span>
                          </div>
                          <p className="text-slate-400 text-xs truncate mb-1">{user?.email}</p>
                          <p className="text-slate-600 text-xs line-clamp-1 leading-relaxed">{appeal.explanation}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${APPEAL_BADGE[appeal.status]}`}>{appeal.status}</span>
                          {appeal.evidence?.length > 0 && <span className="text-slate-400 text-xs flex items-center gap-1">📎 {appeal.evidence.length}</span>}
                          <span className="text-slate-300 text-xs">{fmt(appeal.createdAt)}</span>
                          <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Appeals Pagination */}
            {appealTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400">Page {appealPage} of {appealTotalPages} · {appealTotal} appeals</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setAppealPage(p => p - 1); loadAppeals({ p: appealPage - 1 }); }} disabled={appealPage <= 1} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">←</button>
                  {Array.from({ length: Math.min(5, appealTotalPages) }, (_, i) => {
                    const p = appealTotalPages <= 5 ? i + 1 : appealPage <= 3 ? i + 1 : appealPage >= appealTotalPages - 2 ? appealTotalPages - 4 + i : appealPage - 2 + i;
                    return (
                      <button key={p} onClick={() => { setAppealPage(p); loadAppeals({ p }); }} className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${p === appealPage ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}>{p}</button>
                    );
                  })}
                  <button onClick={() => { setAppealPage(p => p + 1); loadAppeals({ p: appealPage + 1 }); }} disabled={appealPage >= appealTotalPages} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">→</button>
                </div>
              </div>
            )}
          </div>
        )}
        </main>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-slate-900 font-bold text-lg mb-1">{modal.action === 'ban' ? '🚫 Ban User' : modal.action === 'suspend' ? '⏸ Suspend User' : '✅ Activate User'}</h3>
            <p className="text-slate-500 text-sm mb-5">{modal.action === 'activate' ? `Restore full access for ${modal.user.email}?` : `${modal.user.email} will be notified by email.`}</p>
            {modal.action !== 'activate' && (
              <div className="space-y-4 mb-5">
                <div>
                  <label className="nh-label">Reason <span className="text-slate-400 font-normal">(sent to user)</span></label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder={`Reason for ${modal.action}ning…`} className="nh-input resize-none" />
                </div>
                {modal.action === 'suspend' && (
                  <div>
                    <label className="nh-label">Duration (days)</label>
                    <input type="number" min={1} max={365} value={suspendDays} onChange={e => setSuspendDays(e.target.value)} className="nh-input" />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm">Cancel</button>
              <button onClick={handleAction} disabled={acting} className={`flex-1 py-3 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${modal.action === 'ban' ? 'bg-red-600 hover:bg-red-700' : modal.action === 'suspend' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {acting ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Processing...</> : `Confirm ${modal.action.charAt(0).toUpperCase() + modal.action.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerUserId && (
        <UserDetailDrawer
          userId={drawerUserId}
          onClose={() => setDrawerUserId(null)}
          onUserChanged={() => { loadUsers(); loadStats(); setQueueRefresh(k => k + 1); }}
        />
      )}

      {panel && <AppealPanel appeal={panel} onClose={() => setPanel(null)} onReviewed={handleReviewed} />}
    </div>
  );
}
