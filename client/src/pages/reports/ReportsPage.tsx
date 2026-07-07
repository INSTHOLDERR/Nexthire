import { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';
import { getReportsAgainstMe, respondToReport, ReportAgainstMe } from '../../services/socialService';
import toast from 'react-hot-toast';

interface Report {
  _id: string;
  targetType?: 'post' | 'user';
  postId?: { _id: string; title: string } | null;
  targetUserId?: { _id: string; firstName?: string; lastName?: string; profilePicture?: string; headline?: string } | null;
  reason: string;
  description?: string;
  status: string;
  adminNote?: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string,string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'submitted'|'against'>('submitted');
  const [reports, setReports] = useState<Report[]>([]);
  const [againstMe, setAgainstMe] = useState<ReportAgainstMe[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<ReportAgainstMe | null>(null);
  const [responseText, setResponseText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'submitted') {
        const res = await api.get('/social/my-reports', { params: { page: 1 } });
        setReports(res.data.data.reports ?? []);
      } else {
        const res = await getReportsAgainstMe();
        setAgainstMe(res.data.data ?? []);
      }
    } catch { toast.error('Could not load reports'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitResponse = async () => {
    if (!responding || !responseText.trim()) return toast.error('Please write your response');
    setBusy(true);
    try {
      await respondToReport(responding._id, responseText.trim());
      toast.success('Response sent — the moderation team will see it.');
      setResponding(null);
      setResponseText('');
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not send response');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Reports</h1>
        <p className="text-sm text-slate-500 mb-5">Reports you filed, and reports made against you or your posts.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 mb-5 shadow-sm">
          {([['submitted','📤 My reports'],['against','🛡 Against me']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${tab === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse"/>)}</div>

        ) : tab === 'submitted' ? (
          reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-3xl mb-2">📤</p>
              <p className="font-bold text-slate-800">No reports filed</p>
              <p className="text-sm text-slate-400 mt-1">Reports you make on posts or users appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${r.targetType === 'user' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {r.targetType === 'user' ? '👤 User report' : '📝 Post report'}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLOR[r.status] ?? STATUS_COLOR.pending}`}>{r.status}</span>
                    <span className="text-xs text-slate-400 ml-auto">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{r.reason.replace(/_/g,' ')}</p>
                  {r.targetType === 'user' && r.targetUserId && (
                    <p className="text-xs text-slate-500 mt-0.5">Against: <span className="font-semibold">{r.targetUserId.firstName} {r.targetUserId.lastName ?? ''}</span></p>
                  )}
                  {r.targetType !== 'user' && r.postId && (
                    <p className="text-xs text-slate-500 mt-0.5">Post: <span className="font-semibold">"{r.postId.title}"</span></p>
                  )}
                  {r.description && <p className="text-sm text-slate-600 mt-1.5">{r.description}</p>}
                  {r.adminNote && <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2"><span className="font-bold">Moderator:</span> {r.adminNote}</p>}
                </div>
              ))}
            </div>
          )

        ) : (
          /* ── Against me ── */
          againstMe.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-3xl mb-2">🛡</p>
              <p className="font-bold text-slate-800">No reports against you</p>
              <p className="text-sm text-slate-400 mt-1">If someone reports you or your posts, it will show here and you can share your side of the story.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
                ℹ️ Reporters stay anonymous. You can add your response to each report — the moderation team reads it before taking any action.
              </div>
              {againstMe.map(r => (
                <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${r.targetType === 'user' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {r.targetType === 'user' ? '👤 Your account' : '📝 Your post'}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLOR[r.status] ?? STATUS_COLOR.pending}`}>{r.status}</span>
                    <span className="text-xs text-slate-400 ml-auto">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">Reason: {r.reason.replace(/_/g,' ')}</p>
                  {r.post && <p className="text-xs text-slate-500 mt-0.5">Post: <span className="font-semibold">"{r.post.title}"</span></p>}
                  {r.description && <p className="text-sm text-slate-600 mt-1.5">{r.description}</p>}

                  {r.targetResponse ? (
                    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Your response</p>
                      <p className="text-sm text-slate-600">{r.targetResponse}</p>
                      {r.status !== 'resolved' && (
                        <button onClick={() => { setResponding(r); setResponseText(r.targetResponse ?? ''); }} className="text-xs font-bold text-blue-600 hover:underline mt-1.5 cursor-pointer">Edit response</button>
                      )}
                    </div>
                  ) : r.status !== 'resolved' ? (
                    <button
                      onClick={() => { setResponding(r); setResponseText(''); }}
                      className="mt-3 px-4 py-2 text-xs font-bold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                    >💬 Respond to this report</button>
                  ) : null}

                  {r.adminNote && <p className="text-xs text-slate-500 mt-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2"><span className="font-bold">Moderator decision:</span> {r.adminNote}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Respond modal */}
      {responding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setResponding(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">Your side of the story</h3>
            <p className="text-sm text-slate-500 mb-4">This is shown to the moderation team next to the report before they decide anything.</p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-4">
              <p className="text-sm font-semibold text-slate-700 capitalize">Report: {responding.reason.replace(/_/g,' ')}</p>
              {responding.post && <p className="text-xs text-slate-500 mt-0.5">On your post "{responding.post.title}"</p>}
            </div>
            <textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              rows={4}
              maxLength={2000}
              autoFocus
              placeholder="Explain what happened from your side…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setResponding(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={submitResponse} disabled={busy || !responseText.trim()} className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 cursor-pointer">
                {busy ? 'Sending…' : 'Send response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
