import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import NHLogo from '../../components/common/NHLogo';
import { useAuth } from '../../hooks/useAuth';
import { getSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';
import { BannedState, AccountStatusChangedEvent } from '../../types';

const SUPPORT_EMAIL = 'nexthireadmin@gmail.com';

const readSessionState = <T,>(key: string): T | null => {
  try {
    const s = sessionStorage.getItem(key);
    if (s) { sessionStorage.removeItem(key); return JSON.parse(s) as T; }
  } catch {}
  return null;
};

export default function BannedPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const { user, logout } = useAuth();
  const ssState   = readSessionState<BannedState>('nh_banned_state');
  const pageState = (state ?? ssState ?? {}) as BannedState;
  const userId = user?.id ?? pageState?.userId;

  const bannedAt = pageState?.bannedAt
    ? new Date(pageState.bannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    socket.emit('join', String(userId));
    socket.on('account_status_changed', ({ code }: AccountStatusChangedEvent) => {
      if (code === 'ACTIVE') {
        toast.success('Your account has been reactivated! Please sign in.', { duration: 6000 });
        logout();
        navigate('/login');
      }
    });
    return () => { socket.off('account_status_changed'); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackToLogin = () => { logout(); navigate('/login'); };

  const handleEmailAppeal = () => {
    const subject = encodeURIComponent('Appeal: Account Ban — NextHire');
    const body    = encodeURIComponent(`Hello NextHire Support,\n\nI would like to appeal the ban on my account.\n\nBanned on: ${bannedAt}\nReason given: ${pageState?.banReason || 'Not specified'}\n\nExplanation:\n[Please write your explanation here]\n\nThank you.`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <button onClick={handleBackToLogin} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Back to sign in
          </button>
        </div>
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
            <div className="flex justify-center mb-4"><NHLogo size={32} showWordmark wordmarkClass="text-xl font-bold text-slate-800" /></div>
            <div className="w-14 h-14 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </div>
            <span className="inline-block bg-red-100 text-red-600 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-3">Permanently Banned</span>
            <h1 className="text-2xl font-bold text-slate-900">Account Banned</h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">Your account has been permanently removed from NextHire for violating our Terms of Service.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-slate-600 font-semibold mb-4 text-xs uppercase tracking-wider">Ban Details</h2>
            <div className="space-y-0">
              <div className="flex justify-between items-center text-sm py-3 border-b border-slate-100"><span className="text-slate-500">Status</span><span className="bg-red-100 text-red-700 font-semibold text-xs px-2.5 py-1 rounded-full">Banned</span></div>
              <div className="flex justify-between items-center text-sm py-3 border-b border-slate-100"><span className="text-slate-500">Banned on</span><span className="text-slate-800 font-medium">{bannedAt}</span></div>
              <div className="pt-3"><p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">Reason</p><p className="text-slate-800 text-sm leading-relaxed">{pageState?.banReason || 'Severe violation of community guidelines'}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <div><h2 className="text-slate-800 font-semibold mb-1">Think this is a mistake?</h2><p className="text-slate-500 text-sm leading-relaxed">Contact our admin team. We'll review your case within 3–5 business days.</p></div>
              <button onClick={handleEmailAppeal} className="nh-btn-primary">Contact Admin by Email</button>
              <p className="text-slate-400 text-xs">Sends to: <span className="font-medium text-slate-600">{SUPPORT_EMAIL}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
