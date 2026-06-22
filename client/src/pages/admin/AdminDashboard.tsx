import NHLogo from '../../components/common/NHLogo';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSocket } from '../../hooks/useSocket';
import { getUsers, setStatus, getAppeals, reviewAppeal } from '../../services/adminService';
import { AdminUser, AdminAppeal, AdminAction, AppealStatus } from '../../types';
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
  const [tab,         setTab]         = useState<'users' | 'appeals'>('users');
  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [appeals,     setAppeals]     = useState<AdminAppeal[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<ModalState | null>(null);
  const [panel,       setPanel]       = useState<AdminAppeal | null>(null);
  const [reason,      setReason]      = useState('');
  const [suspendDays, setSuspendDays] = useState('7');
  const [acting,      setActing]      = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const logout = () => { localStorage.removeItem('nh_admin_token'); navigate('/admin'); };

  const loadUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await getUsers({ search: q, limit: 50 });
      setUsers(res.data.data.users as AdminUser[]);
    } catch (err) {
      if ((err as AxiosError).response?.status === 401) { toast.error('Session expired'); logout(); }
    } finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppeals();
      setAppeals(res.data.data as AdminAppeal[]);
    } catch { toast.error('Failed to load appeals'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('nh_admin_token')) { navigate('/admin'); return; }
    if (tab === 'users') loadUsers(search);
    else loadAppeals();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_admin');

    socket.on('new_appeal', (appeal: AdminAppeal) => {
      setAppeals(prev => [appeal, ...prev]);
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
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadUsers(val), 300);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <NHLogo size={28} />
            <span className="font-bold text-slate-800 text-sm sm:text-base">NextHire <span className="text-slate-400 font-normal">Admin</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" title="Live — socket connected" />
            <span className="text-slate-400 text-xs hidden sm:inline">Live</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Users', val: users.length,                                   icon: '👥', col: 'text-slate-700' },
            { label: 'Suspended',   val: users.filter(u => u.status === 'suspended').length, icon: '⏸', col: 'text-amber-600' },
            { label: 'Banned',      val: users.filter(u => u.status === 'banned').length,    icon: '🚫', col: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg sm:text-xl">{s.icon}</span>
                <span className={`text-xl sm:text-2xl font-bold ${s.col}`}>{loading && tab === 'users' ? '—' : s.val}</span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5 sm:mb-6 border border-slate-200">
          {(['users', 'appeals'] as const).map(key => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === key ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
              {key === 'appeals' && pending > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{pending}</span>}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-800">All Users</h2>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
                <input value={search} onChange={handleSearch} placeholder="Search name or email…" className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 w-full sm:w-64" />
              </div>
            </div>
            {loading ? (
              <div className="divide-y divide-slate-100">{Array(5).fill(0).map((_, i) => (<div key={i} className="px-5 py-4 flex items-center gap-4"><Sk c="w-9 h-9 !rounded-full flex-shrink-0" /><Sk c="h-4 w-32" /><Sk c="h-4 w-44 ml-2" /><Sk c="h-5 w-20 !rounded-full ml-auto" /><Sk c="h-7 w-16" /><Sk c="h-7 w-12" /></div>))}</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">{search ? `No users matching "${search}"` : 'No users found'}</div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50 border-b border-slate-100">{['User', 'Email', 'Status', 'Joined', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(user => (
                        <tr key={user._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {user.profilePicture ? <img src={user.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0" /> : <div className="w-9 h-9 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{avatar(user)}</div>}
                              <span className="text-slate-800 font-medium truncate max-w-[120px]">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : <span className="text-slate-400">—</span>}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-xs truncate max-w-[160px]">{user.email}</td>
                          <td className="px-5 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[user.status]}`}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></td>
                          <td className="px-5 py-4 text-slate-400 text-xs">{fmt(user.createdAt)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {user.status === 'active' && <><button onClick={() => openModal(user, 'suspend')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-colors">Suspend</button><button onClick={() => openModal(user, 'ban')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors">Ban</button></>}
                              {user.status === 'suspended' && <><button onClick={() => openModal(user, 'activate')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors">Activate</button><button onClick={() => openModal(user, 'ban')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors">Ban</button></>}
                              {user.status === 'banned' && <button onClick={() => openModal(user, 'activate')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors">Unban</button>}
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
                        <div className="flex items-center gap-3">
                          {user.profilePicture ? <img src={user.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" /> : <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold">{avatar(user)}</div>}
                          <div><p className="text-slate-800 font-medium text-sm">{user.firstName || <span className="text-slate-400">—</span>}</p><p className="text-slate-400 text-xs">{user.email}</p></div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[user.status]}`}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                      </div>
                      <div className="flex gap-2">
                        {user.status === 'active' && <><button onClick={() => openModal(user, 'suspend')} className="flex-1 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold">Suspend</button><button onClick={() => openModal(user, 'ban')} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">Ban</button></>}
                        {user.status === 'suspended' && <><button onClick={() => openModal(user, 'activate')} className="flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">Activate</button><button onClick={() => openModal(user, 'ban')} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">Ban</button></>}
                        {user.status === 'banned' && <button onClick={() => openModal(user, 'activate')} className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">Unban</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'appeals' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="font-semibold text-slate-800">User Appeals</h2><p className="text-slate-400 text-xs mt-0.5">New appeals appear instantly · Click any appeal to review</p></div>
              {pending > 0 && <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">{pending} pending</span>}
            </div>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => (<div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4"><Sk c="w-11 h-11 !rounded-full flex-shrink-0" /><div className="flex-1 space-y-2"><Sk c="h-4 w-36" /><Sk c="h-3 w-60" /><Sk c="h-3 w-44" /></div><Sk c="h-6 w-16 !rounded-full flex-shrink-0" /></div>))}</div>
            ) : appeals.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm"><p className="text-slate-400 text-sm">No appeals yet</p></div>
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
          </div>
        )}
      </main>

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

      {panel && <AppealPanel appeal={panel} onClose={() => setPanel(null)} onReviewed={handleReviewed} />}
    </div>
  );
}
