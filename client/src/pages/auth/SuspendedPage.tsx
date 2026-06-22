import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import NHLogo from '../../components/common/NHLogo';
import { getSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { Appeal, AppealStatus, SuspendedState, AppealReviewedEvent, AccountStatusChangedEvent } from '../../types';

const API = import.meta.env.VITE_API_URL as string;

const BADGE: Record<AppealStatus, { cls: string; label: string }> = {
  pending:  { cls: 'bg-amber-50 text-amber-700 border-amber-200',      label: 'Pending Review' },
  approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved ✓' },
  rejected: { cls: 'bg-red-50 text-red-700 border-red-200',            label: 'Rejected' },
};

const readSessionState = <T,>(key: string): T | null => {
  try {
    const s = sessionStorage.getItem(key);
    if (s) { sessionStorage.removeItem(key); return JSON.parse(s) as T; }
  } catch {}
  return null;
};

export default function SuspendedPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const { user, logout } = useAuth();

  const [explanation, setExplanation] = useState('');
  const [images, setImages]           = useState<File[]>([]);
  const [loading, setLoading]         = useState(false);
  const [appeals, setAppeals]         = useState<Appeal[]>([]);
  const [appealsLoading, setAppealsLoading] = useState(true);
  const [notification, setNotification]    = useState<AppealReviewedEvent | null>(null);

  const ssState = readSessionState<SuspendedState>('nh_suspended_state');
  const pageState = (state ?? ssState ?? {}) as SuspendedState;
  const userId = user?.id ?? pageState?.userId;

  const fmt = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

  useEffect(() => {
    if (!userId) { setAppealsLoading(false); return; }
    axios.get(`${API}/admin/appeals/user/${userId}`)
      .then(r => setAppeals(r.data.data as Appeal[]))
      .catch(() => {})
      .finally(() => setAppealsLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    socket.emit('join', String(userId));

    socket.on('appeal_reviewed', (data: AppealReviewedEvent) => {
      setAppeals(prev => prev.map(a => String(a._id) === String(data.appealId) ? { ...a, status: data.status } : a));
      setNotification(data);
      if (data.status === 'approved') toast.success('🎉 Appeal approved! You can sign in now.', { duration: 8000 });
      else toast.error('Your appeal was reviewed. See message below.', { duration: 5000 });
    });

    socket.on('account_status_changed', ({ code }: AccountStatusChangedEvent) => {
      if (code === 'ACTIVE') {
        toast.success('Your account has been reactivated! Please sign in.', { duration: 6000 });
        logout();
        navigate('/login');
      }
    });

    return () => {
      socket.off('appeal_reviewed');
      socket.off('account_status_changed');
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPending = appeals.some(a => a.status === 'pending');

  const handleSubmit = async () => {
    if (!explanation.trim()) return toast.error('Please write an explanation');
    if (!userId) return toast.error('Session error — please try signing in again.');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('userId', String(userId));
      fd.append('explanation', explanation);
      images.forEach(img => fd.append('evidence', img));
      const res = await axios.post(`${API}/admin/appeals/suspension`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAppeals(prev => [{ ...res.data.data, status: 'pending' } as Appeal, ...prev]);
      setExplanation('');
      setImages([]);
      toast.success("Appeal submitted! We'll notify you here when reviewed.");
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to submit.');
    } finally { setLoading(false); }
  };

  const handleBackToLogin = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <button onClick={handleBackToLogin} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Back to sign in
          </button>
        </div>

        {notification && (
          <div className={`mb-5 rounded-2xl border p-4 ${notification.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notification.status === 'approved' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {notification.status === 'approved'
                  ? <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  : <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${notification.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {notification.status === 'approved' ? '🎉 Appeal Approved!' : 'Appeal Decision'}
                </p>
                {notification.adminMsg && <p className={`text-xs mt-1 leading-relaxed ${notification.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>{notification.adminMsg}</p>}
                {notification.status === 'approved' && <button onClick={handleBackToLogin} className="mt-3 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">Sign in now →</button>}
              </div>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="flex justify-center mb-4"><NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" /></div>
            <div className="w-14 h-14 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
            <p className="text-slate-500 text-sm mt-1">Your account has been temporarily restricted</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Suspension Notice</h2>
            <div className="space-y-0">
              {[
                { label: 'Status',       val: <span className="bg-amber-100 text-amber-700 font-semibold text-xs px-2.5 py-1 rounded-full">Suspended</span> },
                { label: 'Suspended on', val: <span className="text-slate-800 font-medium">{fmt(pageState?.suspendedAt)}</span> },
                { label: 'Active until', val: <span className="text-amber-600 font-semibold">{fmt(pageState?.suspendedUntil)}</span> },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm py-3 border-b border-slate-100">
                  <span className="text-slate-500">{row.label}</span>{row.val}
                </div>
              ))}
              <div className="pt-3">
                <p className="text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Reason</p>
                <p className="text-slate-800 text-sm leading-relaxed">{pageState?.suspensionReason || 'Violation of community guidelines'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-slate-800 font-semibold mb-1">My Appeals</h2>
            <p className="text-slate-400 text-xs mb-4">Updates appear here in real time</p>
            {appealsLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />)}</div>
            ) : appeals.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center"><p className="text-slate-400 text-sm">No appeals submitted yet</p></div>
            ) : (
              <div className="space-y-3">
                {appeals.map(appeal => {
                  const badge = BADGE[appeal.status] ?? BADGE.pending;
                  return (
                    <div key={appeal._id} className={`border rounded-xl p-4 transition-all ${appeal.status === 'pending' ? 'border-slate-200 bg-slate-50' : appeal.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${badge.cls}`}>
                          {appeal.status === 'pending' && <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"/></svg>}
                          {badge.label}
                        </span>
                        <span className="text-slate-400 text-xs whitespace-nowrap">{new Date(appeal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed line-clamp-2">{appeal.explanation}</p>
                      {appeal.evidence?.length > 0 && <p className="text-slate-400 text-xs mt-1.5">📎 {appeal.evidence.length} file{appeal.evidence.length > 1 ? 's' : ''} attached</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!hasPending && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-slate-800 font-semibold mb-1">Submit an Appeal</h2>
              <p className="text-slate-500 text-sm mb-5">Believe this is a mistake? Write your explanation below.</p>
              <div className="space-y-4">
                <div>
                  <label className="nh-label">Your explanation</label>
                  <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={4} placeholder="Explain why you believe this suspension is incorrect..." className="nh-input resize-none" />
                </div>
                <div>
                  <label className="nh-label">Evidence <span className="text-slate-400 font-normal">(optional, max 50 MB each)</span></label>
                  <label className="flex items-center gap-3 border border-dashed border-slate-300 hover:border-slate-500 rounded-xl p-4 cursor-pointer transition-colors">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-700 text-sm font-medium">{images.length > 0 ? `${images.length} file(s) selected` : 'Upload screenshots or images'}</p>
                      <p className="text-slate-400 text-xs">Multiple files · Max 50 MB each</p>
                    </div>
                    <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={e => setImages(Array.from(e.target.files ?? []))} />
                  </label>
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {images.map((img, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg">
                          <span className="truncate max-w-[140px]">{img.name}</span>
                          <button onClick={() => setImages(images.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 flex-shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleSubmit} disabled={loading} className="nh-btn-primary">
                  {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Submitting...</span> : 'Submit Appeal'}
                </button>
              </div>
            </div>
          )}

          {hasPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-amber-700 text-sm font-medium">⏳ Your appeal is pending review</p>
              <p className="text-amber-600 text-xs mt-1">You'll be notified here and by email when the admin responds</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
