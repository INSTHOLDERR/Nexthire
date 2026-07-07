import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getReports, actionReport, getWarnings, reviewWarningAppeal, revokeWarning } from '../../services/adminService';

/* ─── Shared bits ──────────────────────────────────────────────────────────── */

interface Stub { _id: string; firstName?: string; lastName?: string; email?: string; profilePicture?: string; status?: string }

const nameOf = (u?: Stub | null) => u?.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : (u?.email ?? '—');

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const Avatar = ({ u, size = 'w-9 h-9' }: { u?: Stub | null; size?: string }) =>
  u?.profilePicture
    ? <img src={u.profilePicture} alt="" className={`${size} rounded-full object-cover flex-shrink-0`}/>
    : <div className={`${size} rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0`}>{(nameOf(u)[0] ?? '?').toUpperCase()}</div>;

const Pager = ({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) =>
  pages > 1 ? (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 cursor-pointer">← Prev</button>
      <span className="text-xs text-slate-400">Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 cursor-pointer">Next →</button>
    </div>
  ) : null;

/* ─── Reports panel ────────────────────────────────────────────────────────── */

interface AdminReport {
  _id: string;
  targetType: 'post' | 'user';
  reason: string;
  description?: string;
  evidenceUrls?: string[];
  status: 'pending' | 'reviewed' | 'resolved';
  adminNote?: string;
  createdAt: string;
  reportedBy?: Stub;
  targetUserId?: Stub | null;
  postId?: { _id: string; title: string; description?: string; status?: string; authorId?: Stub } | null;
}

const REPORT_ACTIONS: { value: string; label: string; cls: string; forPost?: boolean }[] = [
  { value: 'dismiss',      label: 'Dismiss',        cls: 'border-slate-200 text-slate-600 hover:bg-slate-50' },
  { value: 'warn',         label: '⚠️ Warn user',    cls: 'border-amber-200 text-amber-700 hover:bg-amber-50' },
  { value: 'suspend_post', label: '⏸ Suspend post', cls: 'border-orange-200 text-orange-700 hover:bg-orange-50', forPost: true },
  { value: 'suspend_user', label: '⏸ Suspend user', cls: 'border-red-200 text-red-600 hover:bg-red-50' },
  { value: 'ban_user',     label: '🚫 Ban user',     cls: 'border-red-300 text-red-700 hover:bg-red-50' },
];

export function ReportsPanel() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'' | 'post' | 'user'>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [actioning, setActioning] = useState<{ report: AdminReport; action: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getReports({ page: p, targetType: typeFilter || undefined, status: statusFilter || undefined });
      const d = res.data.data;
      setReports(d.reports); setTotal(d.total); setPages(d.pages); setPage(p);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, [typeFilter, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const confirmAction = async () => {
    if (!actioning) return;
    setBusy(true);
    try {
      await actionReport(actioning.report._id, { action: actioning.action as never, adminNote: note.trim() || undefined });
      toast.success('Action applied');
      setActioning(null); setNote('');
      load(page);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h2 className="font-semibold text-slate-800">Reports <span className="text-slate-400 font-normal text-sm">({total})</span></h2>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as never)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600 cursor-pointer focus:outline-none">
            <option value="">All targets</option>
            <option value="post">Post reports</option>
            <option value="user">User reports</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600 cursor-pointer focus:outline-none">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-xl animate-pulse"/>)}</div>
      ) : reports.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-14">No reports found 🎉</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {reports.map(r => {
            const offender = r.targetType === 'user' ? r.targetUserId : r.postId?.authorId;
            return (
              <div key={r._id} className="p-4 sm:p-5">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${r.targetType === 'post' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {r.targetType === 'post' ? '📝 Post report' : '👤 User report'}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{r.status}</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 capitalize">{r.reason.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-400 ml-auto">{fmt(r.createdAt)}</span>
                </div>

                {/* Who reported whom */}
                <div className="flex items-center gap-3 mb-2 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <Avatar u={r.reportedBy} size="w-7 h-7"/>
                    <span className="font-semibold text-slate-700">{nameOf(r.reportedBy)}</span>
                  </div>
                  <span className="text-slate-300">reported</span>
                  <div className="flex items-center gap-2">
                    <Avatar u={offender} size="w-7 h-7"/>
                    <span className="font-semibold text-slate-700">{nameOf(offender)}</span>
                    {offender?.status && offender.status !== 'active' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 capitalize">{offender.status}</span>
                    )}
                  </div>
                </div>

                {r.targetType === 'post' && r.postId && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-2">
                    <p className="text-xs font-bold text-slate-700 truncate">"{r.postId.title}"</p>
                    {r.postId.description && <p className="text-xs text-slate-400 line-clamp-1">{r.postId.description}</p>}
                    {r.postId.status === 'suspended' && <span className="text-[10px] font-bold text-amber-600">⏸ Post is suspended</span>}
                  </div>
                )}

                {r.description && <p className="text-sm text-slate-600 mb-2">{r.description}</p>}

                {(r.evidenceUrls?.length ?? 0) > 0 && (
                  <div className="flex gap-2 mb-3">
                    {r.evidenceUrls!.map((url, i) => (
                      <img key={i} src={url} alt="" onClick={() => setLightbox(url)} className="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"/>
                    ))}
                  </div>
                )}

                {r.adminNote && <p className="text-xs text-slate-500 mb-2"><span className="font-bold">Admin note:</span> {r.adminNote}</p>}

                {r.status === 'pending' && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {REPORT_ACTIONS.filter(a => !a.forPost || r.targetType === 'post').map(a => (
                      <button
                        key={a.value}
                        onClick={() => { setActioning({ report: r, action: a.value }); setNote(''); }}
                        className={`px-3 py-1.5 text-xs font-bold border rounded-xl transition-colors cursor-pointer ${a.cls}`}
                      >{a.label}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pager page={page} pages={pages} onPage={load}/>

      {/* Evidence lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Evidence" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"/>
        </div>
      )}

      {/* Action confirmation with note */}
      {actioning && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActioning(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">
              {REPORT_ACTIONS.find(a => a.value === actioning.action)?.label}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {actioning.action === 'dismiss' ? 'Mark this report as resolved with no further action.'
                : actioning.action === 'warn' ? 'A warning will be added to the user\'s account. They will be notified and can appeal it.'
                : actioning.action === 'suspend_post' ? 'The post will be hidden from the feed. The author will be notified.'
                : actioning.action === 'suspend_user' ? 'The user will lose access until reactivated.'
                : 'The user will be permanently banned.'}
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Note to the user (optional but recommended)…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setActioning(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={confirmAction} disabled={busy} className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 cursor-pointer">
                {busy ? 'Applying…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Warnings panel ───────────────────────────────────────────────────────── */

interface AdminWarning {
  _id: string;
  reason: string;
  note?: string;
  status: 'active' | 'appealed' | 'revoked';
  appealStatus: 'none' | 'pending' | 'approved' | 'rejected';
  appealText?: string;
  appealAdminNote?: string;
  createdAt: string;
  userId?: Stub;
  postId?: { _id: string; title: string } | null;
}

export function WarningsPanel() {
  const [warnings, setWarnings] = useState<AdminWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reviewing, setReviewing] = useState<AdminWarning | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approved' | 'rejected' | 'revoke' | ''>('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getWarnings({ page: p, appealStatus: filter || undefined });
      const d = res.data.data;
      setWarnings(d.warnings); setTotal(d.total); setPages(d.pages); setPage(p);
    } catch { toast.error('Failed to load warnings'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(1); }, [load]);

  const decide = async (decision: 'approved' | 'rejected') => {
    if (!reviewing) return;
    setBusy(decision);
    try {
      await reviewWarningAppeal(reviewing._id, { decision, adminNote: note.trim() || undefined });
      toast.success(decision === 'approved' ? 'Appeal approved — warning revoked' : 'Appeal rejected');
      setReviewing(null); setNote('');
      load(page);
    } catch { toast.error('Failed'); }
    finally { setBusy(''); }
  };

  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this warning?')) return;
    try { await revokeWarning(id); toast.success('Warning revoked'); load(page); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 justify-between">
        <h2 className="font-semibold text-slate-800">Warnings <span className="text-slate-400 font-normal text-sm">({total})</span></h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600 cursor-pointer focus:outline-none">
          <option value="">All</option>
          <option value="pending">Appeals pending</option>
          <option value="none">No appeal</option>
          <option value="approved">Appeal approved</option>
          <option value="rejected">Appeal rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse"/>)}</div>
      ) : warnings.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-14">No warnings issued yet</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {warnings.map(w => (
            <div key={w._id} className="p-4 sm:p-5">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <Avatar u={w.userId} size="w-7 h-7"/>
                  <span className="font-semibold text-slate-700 text-sm">{nameOf(w.userId)}</span>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${w.status === 'active' ? 'bg-red-50 text-red-600 border-red-200' : w.status === 'appealed' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{w.status}</span>
                {w.appealStatus === 'pending' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">⚖️ Appeal pending</span>}
                <span className="text-xs text-slate-400 ml-auto">{fmt(w.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{w.reason}</p>
              {w.note && <p className="text-sm text-slate-500 mt-0.5">{w.note}</p>}
              {w.postId && <p className="text-xs text-slate-400 mt-1">Post: "{w.postId.title}"</p>}

              {w.appealText && (
                <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">User's appeal</p>
                  <p className="text-sm text-slate-600">{w.appealText}</p>
                  {w.appealAdminNote && <p className="text-xs text-slate-500 mt-1.5 border-t border-slate-200 pt-1.5"><span className="font-bold">Response:</span> {w.appealAdminNote}</p>}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-2.5">
                {w.appealStatus === 'pending' && (
                  <button onClick={() => { setReviewing(w); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 cursor-pointer">Review appeal</button>
                )}
                {w.status !== 'revoked' && (
                  <button onClick={() => revoke(w._id)} className="px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 cursor-pointer">Revoke</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={page} pages={pages} onPage={load}/>

      {/* Appeal review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReviewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">Review warning appeal</h3>
            <p className="text-sm text-slate-500 mb-3">From <span className="font-semibold">{nameOf(reviewing.userId)}</span></p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-3">
              <p className="text-xs font-bold text-slate-500 mb-0.5">Warning: {reviewing.reason}</p>
              <p className="text-sm text-slate-700">{reviewing.appealText}</p>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Response to the user (optional)…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => decide('rejected')} disabled={!!busy} className="flex-1 py-2.5 text-sm font-bold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-40 cursor-pointer">
                {busy === 'rejected' ? '…' : '❌ Reject'}
              </button>
              <button onClick={() => decide('approved')} disabled={!!busy} className="flex-1 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 cursor-pointer">
                {busy === 'approved' ? '…' : '✅ Approve & revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard overview panel ─────────────────────────────────────────────── */

export interface AdminStats {
  users: { total: number; user: number; jobseeker: number; recruiter: number; active: number; suspended: number; banned: number; newLast7Days: number };
  posts: { total: number; active: number; suspended: number };
  reports: { pending: number; pendingPost: number; pendingUser: number };
  appeals: { pending: number };
  warnings: { active: number; appealsPending: number };
}

export function DashboardPanel({ stats, loading, onGo }: {
  stats: AdminStats | null;
  loading: boolean;
  onGo: (section: string) => void;
}) {
  const v = (n?: number) => loading || n === undefined ? '—' : n;

  const Card = ({ icon, label, value, sub, color, onClick }: { icon: string; label: string; value: string | number; sub?: string; color: string; onClick?: () => void }) => (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  const needsAttention = (stats?.reports.pending ?? 0) + (stats?.appeals.pending ?? 0) + (stats?.warnings.appealsPending ?? 0);

  return (
    <div className="space-y-6">
      {/* Needs attention banner */}
      {!loading && needsAttention > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap">
          <span className="text-xl">⏰</span>
          <p className="text-sm font-semibold text-amber-800 flex-1">
            {needsAttention} item{needsAttention > 1 ? 's' : ''} waiting for review
          </p>
          <div className="flex gap-2 flex-wrap">
            {(stats?.reports.pending ?? 0) > 0 && <button onClick={() => onGo('reports')} className="px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 text-amber-800 rounded-xl hover:bg-amber-100 cursor-pointer">🚩 {stats!.reports.pending} reports</button>}
            {(stats?.appeals.pending ?? 0) > 0 && <button onClick={() => onGo('appeals')} className="px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 text-amber-800 rounded-xl hover:bg-amber-100 cursor-pointer">⚖️ {stats!.appeals.pending} appeals</button>}
            {(stats?.warnings.appealsPending ?? 0) > 0 && <button onClick={() => onGo('warnings')} className="px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 text-amber-800 rounded-xl hover:bg-amber-100 cursor-pointer">⚠️ {stats!.warnings.appealsPending} warning appeals</button>}
          </div>
        </div>
      )}

      {/* Users */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">Users</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card icon="👥" label="Total users" value={v(stats?.users.total)} sub={`+${v(stats?.users.newLast7Days)} in the last 7 days`} color="text-slate-800" onClick={() => onGo('users')}/>
          <Card icon="🙋" label="Regular users" value={v(stats?.users.user)} sub="No work status set" color="text-slate-600"/>
          <Card icon="💼" label="Job seekers" value={v(stats?.users.jobseeker)} sub="Open to work" color="text-blue-600"/>
          <Card icon="🏢" label="Recruiters" value={v(stats?.users.recruiter)} sub="Currently hiring" color="text-purple-600"/>
        </div>
      </div>

      {/* Account health */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">Account status</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card icon="✅" label="Active" value={v(stats?.users.active)} color="text-emerald-600"/>
          <Card icon="⏸" label="Suspended" value={v(stats?.users.suspended)} color="text-amber-600" onClick={() => onGo('users')}/>
          <Card icon="🚫" label="Banned" value={v(stats?.users.banned)} color="text-red-600" onClick={() => onGo('users')}/>
        </div>
      </div>

      {/* Content & moderation */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">Content & moderation</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card icon="📝" label="Posts" value={v(stats?.posts.total)} sub={`${v(stats?.posts.suspended)} suspended`} color="text-slate-800" onClick={() => onGo('posts')}/>
          <Card icon="🚩" label="Pending reports" value={v(stats?.reports.pending)} sub={`${v(stats?.reports.pendingPost)} posts · ${v(stats?.reports.pendingUser)} users`} color="text-red-600" onClick={() => onGo('reports')}/>
          <Card icon="⚖️" label="Pending appeals" value={v(stats?.appeals.pending)} sub="Suspension / ban appeals" color="text-amber-600" onClick={() => onGo('appeals')}/>
          <Card icon="⚠️" label="Active warnings" value={v(stats?.warnings.active)} sub={`${v(stats?.warnings.appealsPending)} appeals to review`} color="text-orange-600" onClick={() => onGo('warnings')}/>
        </div>
      </div>
    </div>
  );
}

/* ─── Posts management panel ───────────────────────────────────────────────── */

import { getAdminPosts, setAdminPostStatus, deleteAdminPost } from '../../services/adminService';

interface AdminPost {
  id: string;
  title: string;
  description: string;
  media?: { url: string; type: string }[];
  status: string;
  visibility: string;
  likesCount: number;
  commentCount: number;
  reportCount?: number;
  createdAt: string;
  author?: { id: string; firstName?: string; lastName?: string; profilePicture?: string };
}

export function PostsPanel() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirming, setConfirming] = useState<{ post: AdminPost; action: 'suspend' | 'activate' | 'delete' } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawerPostId, setDrawerPostId] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getAdminPosts({ page: p, limit: 12 });
      const d = res.data.data;
      setPosts(d.posts ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setPage(p);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const act = async () => {
    if (!confirming) return;
    setBusy(true);
    const { post, action } = confirming;
    try {
      if (action === 'delete') await deleteAdminPost(post.id);
      else await setAdminPostStatus(post.id, { status: action === 'suspend' ? 'suspended' : 'active', adminNote: note.trim() || undefined });
      toast.success(action === 'delete' ? 'Post removed' : action === 'suspend' ? 'Post suspended' : 'Post reactivated');
      setConfirming(null); setNote('');
      load(page);
    } catch { toast.error('Action failed'); }
    finally { setBusy(false); }
  };

  const shown = posts.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const authorName = p.author?.firstName ? `${p.author.firstName} ${p.author.lastName ?? ''}` : '';
    return (p.title + ' ' + p.description + ' ' + authorName).toLowerCase().includes(q.trim().toLowerCase());
  });

  return (
    <div>
    <PostsReviewQueue onOpenPost={setDrawerPostId} refreshKey={page + total} />
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h2 className="font-semibold text-slate-800">All posts <span className="text-slate-400 font-normal text-sm">({total})</span></h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Filter by title / author…"
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-52"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600 cursor-pointer focus:outline-none">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse"/>)}</div>
      ) : shown.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-14">No posts found</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {shown.map(p => {
            const authorName = p.author?.firstName ? `${p.author.firstName} ${p.author.lastName ?? ''}`.trim() : 'Unknown';
            const thumb = p.media?.find(m => m.type === 'image');
            return (
              <div key={p.id} onClick={() => setDrawerPostId(p.id)} className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-slate-50/60 transition-colors cursor-pointer" title="Open post details & reports">
                {thumb
                  ? <img src={thumb.url} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0"/>
                  : <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg flex-shrink-0">📝</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-slate-900 text-sm truncate">{p.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.status}</span>
                    {(p.reportCount ?? 0) > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">🚩 {p.reportCount} report{p.reportCount! > 1 ? 's' : ''}</span>}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{p.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      {p.author?.profilePicture
                        ? <img src={p.author.profilePicture} alt="" className="w-4 h-4 rounded-full object-cover"/>
                        : <span className="w-4 h-4 rounded-full bg-slate-200 inline-block"/>}
                      <span className="font-semibold text-slate-500">{authorName}</span>
                    </span>
                    <span>❤️ {p.likesCount}</span>
                    <span>💬 {p.commentCount}</span>
                    <span>{fmt(p.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {p.status === 'active'
                    ? <button onClick={e => { e.stopPropagation(); setConfirming({ post: p, action: 'suspend' }); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 cursor-pointer">⏸ Suspend</button>
                    : <button onClick={e => { e.stopPropagation(); setConfirming({ post: p, action: 'activate' }); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 cursor-pointer">✅ Activate</button>}
                  <button onClick={e => { e.stopPropagation(); setConfirming({ post: p, action: 'delete' }); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 cursor-pointer">🗑 Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pager page={page} pages={pages} onPage={load}/>

      {drawerPostId && (
        <PostDetailDrawer postId={drawerPostId} onClose={() => setDrawerPostId(null)} onPostChanged={() => load(page)} />
      )}

      {confirming && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirming(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">
              {confirming.action === 'delete' ? '🗑 Remove post' : confirming.action === 'suspend' ? '⏸ Suspend post' : '✅ Reactivate post'}
            </h3>
            <p className="text-sm text-slate-500 mb-3">"{confirming.post.title}"</p>
            {confirming.action !== 'delete' && (
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Note to the author (optional)…" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-3"/>
            )}
            {confirming.action === 'delete' && <p className="text-xs text-red-500 font-medium mb-3">This permanently removes the post. It cannot be undone.</p>}
            <div className="flex gap-3">
              <button onClick={() => setConfirming(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={act} disabled={busy} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-40 cursor-pointer ${confirming.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-700'}`}>
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

/* ─── Shared: report card with actions + target response (used in drawers) ─── */

import { reviewAppeal } from '../../services/adminService';

function ReportCard({ r, onActed, showPostChip = true }: { r: AdminReport & { targetResponse?: string; targetRespondedAt?: string }; onActed: () => void; showPostChip?: boolean }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmAction = async () => {
    if (!actioning) return;
    setBusy(true);
    try {
      await actionReport(r._id, { action: actioning as never, adminNote: note.trim() || undefined });
      toast.success('Action applied');
      setActioning(null); setNote('');
      onActed();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{r.status}</span>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 capitalize">{r.reason.replace(/_/g, ' ')}</span>
        {showPostChip && r.targetType === 'post' && r.postId && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 truncate max-w-[180px]">📝 "{r.postId.title}"</span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{fmt(r.createdAt)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm mb-1.5">
        <Avatar u={r.reportedBy} size="w-6 h-6"/>
        <span className="font-semibold text-slate-700 text-xs">{nameOf(r.reportedBy)}</span>
        <span className="text-slate-300 text-xs">reported this</span>
      </div>

      {r.description && <p className="text-sm text-slate-600 mb-2">{r.description}</p>}

      {(r.evidenceUrls?.length ?? 0) > 0 && (
        <div className="flex gap-2 mb-2">
          {r.evidenceUrls!.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => setLightbox(url)} className="w-12 h-12 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80"/>
          ))}
        </div>
      )}

      {/* The reported person's side of the story */}
      {r.targetResponse && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-3.5 py-2.5 mb-2">
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide mb-0.5">💬 Their response{r.targetRespondedAt ? ` · ${fmt(r.targetRespondedAt)}` : ''}</p>
          <p className="text-sm text-blue-900">{r.targetResponse}</p>
        </div>
      )}

      {r.adminNote && <p className="text-xs text-slate-500 mb-2"><span className="font-bold">Admin note:</span> {r.adminNote}</p>}

      {r.status === 'pending' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {REPORT_ACTIONS.filter(a => !a.forPost || r.targetType === 'post').map(a => (
            <button key={a.value} onClick={() => { setActioning(a.value); setNote(''); }} className={`px-2.5 py-1.5 text-[11px] font-bold border rounded-xl transition-colors cursor-pointer ${a.cls}`}>{a.label}</button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl"/>
        </div>
      )}

      {actioning && (
        <div className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActioning(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">{REPORT_ACTIONS.find(a => a.value === actioning)?.label}</h3>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Note / warning message to the user (recommended)…" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mt-2"/>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setActioning(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={confirmAction} disabled={busy} className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 cursor-pointer">{busy ? 'Applying…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── User detail drawer ───────────────────────────────────────────────────── */

interface OverviewAppeal { _id: string; type: string; explanation: string; evidence?: string[]; status: string; adminNote?: string; createdAt: string }

export function UserDetailDrawer({ userId, onClose, onUserChanged }: { userId: string; onClose: () => void; onUserChanged: () => void }) {
  const [data, setData] = useState<{ user: Stub & { role?: string; headline?: string; createdAt?: string; workStatus?: string }; reports: (AdminReport & { targetResponse?: string })[]; warnings: AdminWarning[]; appeals: OverviewAppeal[]; postsCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingAppeal, setReviewingAppeal] = useState<OverviewAppeal | null>(null);
  const [reviewingWarning, setReviewingWarning] = useState<AdminWarning | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const { getUserOverview } = await import('../../services/adminService');
      const res = await getUserOverview(userId);
      setData(res.data.data);
    } catch { toast.error('Could not load user'); onClose(); }
    finally { setLoading(false); }
  }, [userId, onClose]);

  useEffect(() => { load(); }, [load]);

  const u = data?.user;
  const roleChip = u?.role === 'recruiter'
    ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">🏢 Recruiter</span>
    : u?.role === 'jobseeker'
      ? <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">💼 Job seeker</span>
      : <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">🙋 Member</span>;

  const decideAppeal = async (status: 'approved' | 'rejected') => {
    if (!reviewingAppeal) return;
    if (!note.trim()) return toast.error('Write a message to the user first');
    setBusy(status);
    try {
      await reviewAppeal(reviewingAppeal._id, { status, adminMsg: note.trim() });
      toast.success(status === 'approved' ? 'Appeal approved — account reactivated' : 'Appeal rejected');
      setReviewingAppeal(null); setNote('');
      load(); onUserChanged();
    } catch { toast.error('Failed'); }
    finally { setBusy(''); }
  };

  const decideWarningAppeal = async (decision: 'approved' | 'rejected') => {
    if (!reviewingWarning) return;
    setBusy(decision);
    try {
      await reviewWarningAppeal(reviewingWarning._id, { decision, adminNote: note.trim() || undefined });
      toast.success(decision === 'approved' ? 'Warning revoked' : 'Appeal rejected');
      setReviewingWarning(null); setNote('');
      load();
    } catch { toast.error('Failed'); }
    finally { setBusy(''); }
  };

  const SectionHead = ({ icon, label, count }: { icon: string; label: string; count: number }) => (
    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-6 mb-2 flex items-center gap-1.5">
      <span>{icon}</span>{label}<span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{count}</span>
    </h4>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900">User details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
        </div>

        {loading || !data ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-xl animate-pulse"/>)}</div>
        ) : (
          <div className="p-5">
            {/* Profile card */}
            <div className="flex items-center gap-4">
              <Avatar u={u} size="w-16 h-16"/>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-lg leading-tight">{nameOf(u)}</p>
                <p className="text-xs text-slate-400 truncate">{u?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {roleChip}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${u?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : u?.status === 'suspended' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{u?.status}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              {[['Posts', data.postsCount], ['Reports', data.reports.length], ['Warnings', data.warnings.filter(w => w.status === 'active').length]].map(([l, v]) => (
                <div key={l as string} className="bg-slate-50 border border-slate-100 rounded-xl py-2.5">
                  <p className="text-lg font-bold text-slate-800 leading-tight">{v}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{l}</p>
                </div>
              ))}
            </div>

            {/* Reports against this user (incl. reports on their posts) */}
            <SectionHead icon="🚩" label="Reports against them" count={data.reports.length}/>
            {data.reports.length === 0
              ? <p className="text-sm text-slate-400">No reports — clean record.</p>
              : <div className="space-y-3">{data.reports.map(r => <ReportCard key={r._id} r={r} onActed={() => { load(); onUserChanged(); }}/>)}</div>}

            {/* Warnings */}
            <SectionHead icon="⚠️" label="Warnings" count={data.warnings.length}/>
            {data.warnings.length === 0
              ? <p className="text-sm text-slate-400">No warnings issued.</p>
              : <div className="space-y-3">
                  {data.warnings.map(w => (
                    <div key={w._id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${w.status === 'active' ? 'bg-red-50 text-red-600 border-red-200' : w.status === 'appealed' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>{w.status}</span>
                        {w.appealStatus === 'pending' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">⚖️ Appeal pending</span>}
                        <span className="text-xs text-slate-400 ml-auto">{fmt(w.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{w.reason}</p>
                      {w.note && <p className="text-xs text-slate-500 mt-0.5">{w.note}</p>}
                      {w.appealText && (
                        <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Their appeal</p>
                          <p className="text-sm text-slate-600">{w.appealText}</p>
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-2">
                        {w.appealStatus === 'pending' && <button onClick={() => { setReviewingWarning(w); setNote(''); }} className="px-2.5 py-1.5 text-[11px] font-bold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 cursor-pointer">Review appeal</button>}
                        {w.status !== 'revoked' && <button onClick={async () => { if (window.confirm('Revoke this warning?')) { await revokeWarning(w._id); toast.success('Revoked'); load(); } }} className="px-2.5 py-1.5 text-[11px] font-bold border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 cursor-pointer">Revoke</button>}
                      </div>
                    </div>
                  ))}
                </div>}

            {/* Account appeals */}
            <SectionHead icon="⚖️" label="Account appeals" count={data.appeals.length}/>
            {data.appeals.length === 0
              ? <p className="text-sm text-slate-400">No suspension / ban appeals.</p>
              : <div className="space-y-3">
                  {data.appeals.map(a => (
                    <div key={a._id} className="border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 capitalize">{a.type}</span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${a.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : a.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{a.status}</span>
                        <span className="text-xs text-slate-400 ml-auto">{fmt(a.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700">{a.explanation}</p>
                      {a.adminNote && <p className="text-xs text-slate-500 mt-1.5"><span className="font-bold">Your reply:</span> {a.adminNote}</p>}
                      {a.status === 'pending' && (
                        <button onClick={() => { setReviewingAppeal(a); setNote(''); }} className="mt-2 px-2.5 py-1.5 text-[11px] font-bold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 cursor-pointer">Review appeal</button>
                      )}
                    </div>
                  ))}
                </div>}
          </div>
        )}

        {/* Warning appeal review */}
        {reviewingWarning && (
          <div className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReviewingWarning(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900 mb-2">Review warning appeal</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-3">
                <p className="text-xs font-bold text-slate-500">{reviewingWarning.reason}</p>
                <p className="text-sm text-slate-700 mt-0.5">{reviewingWarning.appealText}</p>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Response to the user (optional)…" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
              <div className="flex gap-3 mt-4">
                <button onClick={() => decideWarningAppeal('rejected')} disabled={!!busy} className="flex-1 py-2.5 text-sm font-bold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-40 cursor-pointer">❌ Reject</button>
                <button onClick={() => decideWarningAppeal('approved')} disabled={!!busy} className="flex-1 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 cursor-pointer">✅ Approve</button>
              </div>
            </div>
          </div>
        )}

        {/* Account appeal review */}
        {reviewingAppeal && (
          <div className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReviewingAppeal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900 mb-2">Review account appeal</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-3">
                <p className="text-sm text-slate-700">{reviewingAppeal.explanation}</p>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Message to the user (required — sent by email)…" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"/>
              <div className="flex gap-3 mt-4">
                <button onClick={() => decideAppeal('rejected')} disabled={!!busy} className="flex-1 py-2.5 text-sm font-bold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-40 cursor-pointer">❌ Reject</button>
                <button onClick={() => decideAppeal('approved')} disabled={!!busy} className="flex-1 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 cursor-pointer">✅ Approve & reactivate</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Post detail drawer ───────────────────────────────────────────────────── */

export function PostDetailDrawer({ postId, onClose, onPostChanged }: { postId: string; onClose: () => void; onPostChanged: () => void }) {
  const [data, setData] = useState<{ post: { _id: string; title: string; description: string; media?: { url: string; type: string }[]; status: string; likes?: string[]; commentCount?: number; shareCount?: number; createdAt: string; authorId?: Stub & { status?: string } }; reports: (AdminReport & { targetResponse?: string })[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<'suspend' | 'activate' | 'delete' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { getPostOverview } = await import('../../services/adminService');
      const res = await getPostOverview(postId);
      setData(res.data.data);
    } catch { toast.error('Could not load post'); onClose(); }
    finally { setLoading(false); }
  }, [postId, onClose]);

  useEffect(() => { load(); }, [load]);

  const act = async () => {
    if (!confirming || !data) return;
    setBusy(true);
    try {
      if (confirming === 'delete') { await deleteAdminPost(data.post._id); toast.success('Post removed'); onClose(); }
      else {
        await setAdminPostStatus(data.post._id, { status: confirming === 'suspend' ? 'suspended' : 'active', adminNote: note.trim() || undefined });
        toast.success(confirming === 'suspend' ? 'Post suspended' : 'Post reactivated');
        load();
      }
      onPostChanged();
      setConfirming(null); setNote('');
    } catch { toast.error('Action failed'); }
    finally { setBusy(false); }
  };

  const p = data?.post;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900">Post details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
        </div>

        {loading || !data || !p ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-xl animate-pulse"/>)}</div>
        ) : (
          <div className="p-5">
            {/* Post card */}
            <div className="border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{p.status}</span>
                <span className="text-xs text-slate-400 ml-auto">{fmt(p.createdAt)}</span>
              </div>
              <p className="font-bold text-slate-900">{p.title}</p>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{p.description}</p>
              {(p.media?.length ?? 0) > 0 && (
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {p.media!.map((m, i) => m.type === 'image'
                    ? <img key={i} src={m.url} alt="" className="w-20 h-20 rounded-xl object-cover border border-slate-100"/>
                    : <div key={i} className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl">{m.type === 'video' ? '🎬' : '📄'}</div>)}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Avatar u={p.authorId} size="w-5 h-5"/>
                  <span className="font-semibold text-slate-600">{nameOf(p.authorId)}</span>
                  {p.authorId?.status && p.authorId.status !== 'active' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 capitalize">{p.authorId.status}</span>}
                </span>
                <span>❤️ {p.likes?.length ?? 0}</span>
                <span>💬 {p.commentCount ?? 0}</span>
                <span>↗ {p.shareCount ?? 0}</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                {p.status === 'active'
                  ? <button onClick={() => { setConfirming('suspend'); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 cursor-pointer">⏸ Suspend</button>
                  : <button onClick={() => { setConfirming('activate'); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 cursor-pointer">✅ Activate</button>}
                <button onClick={() => { setConfirming('delete'); setNote(''); }} className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 cursor-pointer">🗑 Remove</button>
              </div>
            </div>

            {/* Reports against this post */}
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-6 mb-2 flex items-center gap-1.5">
              <span>🚩</span>Reports on this post<span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{data.reports.length}</span>
            </h4>
            {data.reports.length === 0
              ? <p className="text-sm text-slate-400">No reports on this post.</p>
              : <div className="space-y-3">{data.reports.map(r => <ReportCard key={r._id} r={r} showPostChip={false} onActed={() => { load(); onPostChanged(); }}/>)}</div>}
          </div>
        )}

        {confirming && p && (
          <div className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirming(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900 mb-1">{confirming === 'delete' ? '🗑 Remove post' : confirming === 'suspend' ? '⏸ Suspend post' : '✅ Reactivate post'}</h3>
              <p className="text-sm text-slate-500 mb-3">"{p.title}"</p>
              {confirming !== 'delete' && <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Note to the author (optional)…" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-3"/>}
              {confirming === 'delete' && <p className="text-xs text-red-500 font-medium mb-3">This permanently removes the post.</p>}
              <div className="flex gap-3">
                <button onClick={() => setConfirming(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={act} disabled={busy} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-40 cursor-pointer ${confirming === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-700'}`}>{busy ? 'Working…' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── "Needs review" queues (Users & Posts sections) ───────────────────────── */

import { getModerationQueue } from '../../services/adminService';

interface QueueData {
  userReports:    { _id: string; reason: string; targetUserId?: Stub; reportedBy?: Stub; createdAt: string }[];
  postReports:    { _id: string; reason: string; postId?: { _id: string; title: string; authorId?: Stub }; reportedBy?: Stub; createdAt: string }[];
  appeals:        { _id: string; type: string; userId?: Stub; explanation: string; createdAt: string }[];
  warningAppeals: { _id: string; reason: string; userId?: Stub; appealText?: string; createdAt: string }[];
}

/** Queue shown ABOVE the users table — every pending user report, account
    appeal and warning appeal, each opening that user's detail drawer. */
export function UsersReviewQueue({ onOpenUser, refreshKey }: { onOpenUser: (userId: string) => void; refreshKey?: number }) {
  const [q, setQ] = useState<QueueData | null>(null);

  useEffect(() => {
    getModerationQueue().then(r => setQ(r.data.data)).catch(() => {});
  }, [refreshKey]);

  const items: { key: string; icon: string; cls: string; user?: Stub; line: string; sub: string }[] = [
    ...(q?.userReports ?? []).map(r => ({
      key: `r-${r._id}`, icon: '🚩', cls: 'border-red-200 bg-red-50/50',
      user: r.targetUserId,
      line: `${nameOf(r.targetUserId)} was reported — ${r.reason.replace(/_/g, ' ')}`,
      sub: `by ${nameOf(r.reportedBy)} · ${fmt(r.createdAt)}`,
    })),
    ...(q?.appeals ?? []).map(a => ({
      key: `a-${a._id}`, icon: '⚖️', cls: 'border-amber-200 bg-amber-50/50',
      user: a.userId,
      line: `${nameOf(a.userId)} appealed their ${a.type}`,
      sub: `${a.explanation.slice(0, 60)}${a.explanation.length > 60 ? '…' : ''} · ${fmt(a.createdAt)}`,
    })),
    ...(q?.warningAppeals ?? []).map(w => ({
      key: `w-${w._id}`, icon: '⚠️', cls: 'border-orange-200 bg-orange-50/50',
      user: w.userId,
      line: `${nameOf(w.userId)} appealed a warning`,
      sub: `${w.reason} · ${fmt(w.createdAt)}`,
    })),
  ];

  if (!q || items.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-4">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <h2 className="font-semibold text-slate-800 text-sm">⏰ Needs review</h2>
        <span className="text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{items.length}</span>
        <span className="text-xs text-slate-400 ml-auto hidden sm:inline">Click an item to open the user's details and take action</span>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {items.map(it => (
          <button
            key={it.key}
            onClick={() => it.user?._id && onOpenUser(it.user._id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all hover:shadow-sm cursor-pointer ${it.cls}`}
          >
            <span className="text-lg flex-shrink-0">{it.icon}</span>
            <Avatar u={it.user} size="w-8 h-8"/>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{it.line}</p>
              <p className="text-[11px] text-slate-400 truncate">{it.sub}</p>
            </div>
            <span className="text-slate-300 flex-shrink-0">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Queue shown ABOVE the posts list — every pending post report, each opening
    that post's detail drawer where the admin can warn / suspend / escalate. */
export function PostsReviewQueue({ onOpenPost, refreshKey }: { onOpenPost: (postId: string) => void; refreshKey?: number }) {
  const [q, setQ] = useState<QueueData | null>(null);

  useEffect(() => {
    getModerationQueue().then(r => setQ(r.data.data)).catch(() => {});
  }, [refreshKey]);

  const items = q?.postReports ?? [];
  if (!q || items.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-4">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <h2 className="font-semibold text-slate-800 text-sm">🚩 Reported posts — needs review</h2>
        <span className="text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{items.length}</span>
        <span className="text-xs text-slate-400 ml-auto hidden sm:inline">Click to open the post with all its reports</span>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {items.map(r => (
          <button
            key={r._id}
            onClick={() => r.postId?._id && onOpenPost(r.postId._id)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50/50 text-left transition-all hover:shadow-sm cursor-pointer"
          >
            <span className="text-lg flex-shrink-0">📝</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">"{r.postId?.title ?? 'Post'}" — {r.reason.replace(/_/g, ' ')}</p>
              <p className="text-[11px] text-slate-400 truncate">by {nameOf(r.postId?.authorId)} · reported by {nameOf(r.reportedBy)} · {fmt(r.createdAt)}</p>
            </div>
            <span className="text-slate-300 flex-shrink-0">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
