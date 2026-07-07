import { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import { getMyWarnings, appealWarning, Warning, getReportsAgainstMe, respondToReport, ReportAgainstMe } from '../../services/socialService';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-red-50 text-red-600 border-red-200',
  appealed: 'bg-amber-50 text-amber-600 border-amber-200',
  revoked:  'bg-emerald-50 text-emerald-600 border-emerald-200',
};

const APPEAL_BADGE: Record<string, { cls: string; label: string }> = {
  pending:  { cls: 'bg-amber-50 text-amber-700 border-amber-200',     label: 'Appeal pending review' },
  approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Appeal approved — warning revoked' },
  rejected: { cls: 'bg-slate-100 text-slate-500 border-slate-200',    label: 'Appeal rejected' },
};

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam', harassment: 'Harassment', misinformation: 'Misinformation',
  inappropriate: 'Inappropriate content', copyright: 'Copyright violation', other: 'Other',
};

export default function WarningsPage() {
  const [tab, setTab] = useState<'warnings' | 'reports'>('warnings');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [reports,  setReports]  = useState<ReportAgainstMe[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [appealing, setAppealing] = useState<Warning | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responding, setResponding] = useState<ReportAgainstMe | null>(null);
  const [responseText, setResponseText] = useState('');

  const load = () => {
    Promise.all([getMyWarnings(), getReportsAgainstMe()])
      .then(([w, r]) => { setWarnings(w.data.data ?? []); setReports(r.data.data ?? []); })
      .catch(() => toast.error('Could not load your account standing'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submitResponse = async () => {
    if (!responding || !responseText.trim()) return toast.error('Please write your response');
    setSubmitting(true);
    try {
      await respondToReport(responding._id, responseText.trim());
      toast.success('Response saved — the moderation team will see it when reviewing.');
      setResponding(null);
      setResponseText('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save response');
    } finally { setSubmitting(false); }
  };

  const submitAppeal = async () => {
    if (!appealing || !explanation.trim()) return toast.error('Please write your explanation');
    setSubmitting(true);
    try {
      await appealWarning(appealing._id, explanation.trim());
      toast.success('Appeal submitted — the moderation team will review it.');
      setAppealing(null);
      setExplanation('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not submit appeal');
    } finally { setSubmitting(false); }
  };

  const active = warnings.filter(w => w.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">🛡️ Account standing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Warnings from the moderation team and reports made about you or your posts.
            You can appeal each warning once, and add your side of the story to any report
            before the team reviews it.
          </p>
          {active > 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 font-medium">
              You have {active} active warning{active > 1 ? 's' : ''} on your account. Repeated warnings can lead to suspension.
            </div>
          )}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 mt-4">
            {([['warnings', `🚨 Warnings${warnings.length ? ` (${warnings.length})` : ''}`], ['reports', `🚩 Reports about me${reports.length ? ` (${reports.length})` : ''}`]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${tab === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="bg-white border border-slate-200 rounded-2xl h-28 animate-pulse"/>)}</div>
        ) : tab === 'reports' ? (
          reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center">
              <div className="text-4xl mb-3">🕊️</div>
              <p className="font-bold text-slate-800">No reports about you</p>
              <p className="text-sm text-slate-400 mt-1">Nobody has reported you or your posts. Keep being awesome!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${r.targetType === 'post' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {r.targetType === 'post' ? '📝 About your post' : '👤 About your account'}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {r.status === 'pending' ? 'Under review' : 'Reviewed'}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">Reason: {REASON_LABEL[r.reason] ?? r.reason}</p>
                  {r.post && <p className="text-xs text-slate-400 mt-1">Post: <span className="font-semibold text-slate-600">"{r.post.title}"</span></p>}
                  <p className="text-[11px] text-slate-400 mt-1.5">Reports are anonymous — the reporter's identity is never shown.</p>
                  {r.adminNote && (
                    <div className="mt-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5">
                      <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide mb-0.5">Moderation team</p>
                      <p className="text-sm text-blue-800">{r.adminNote}</p>
                    </div>
                  )}
                  {r.targetResponse ? (
                    <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
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
                    >💬 Add your side of the story</button>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : warnings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-slate-800">No warnings</p>
            <p className="text-sm text-slate-400 mt-1">Your account is in good standing. Keep it up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.map(w => (
              <div key={w._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_BADGE[w.status]}`}>{w.status}</span>
                  {w.appealStatus !== 'none' && APPEAL_BADGE[w.appealStatus] && (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${APPEAL_BADGE[w.appealStatus].cls}`}>{APPEAL_BADGE[w.appealStatus].label}</span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">{new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="font-semibold text-slate-900 text-sm">{w.reason}</p>
                {w.note && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{w.note}</p>}
                {w.postId && <p className="text-xs text-slate-400 mt-1.5">Related post: <span className="font-semibold text-slate-600">"{w.postId.title}"</span></p>}
                {w.appealText && (
                  <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Your appeal</p>
                    <p className="text-sm text-slate-600">{w.appealText}</p>
                    {w.appealAdminNote && (
                      <p className="text-xs text-slate-500 mt-1.5 border-t border-slate-200 pt-1.5"><span className="font-bold">Moderator:</span> {w.appealAdminNote}</p>
                    )}
                  </div>
                )}
                {w.status === 'active' && w.appealStatus === 'none' && (
                  <button
                    onClick={() => setAppealing(w)}
                    className="mt-3 px-4 py-2 text-xs font-bold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    ⚖️ Appeal this warning
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Respond to report modal */}
      {responding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setResponding(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">Your side of the story</h3>
            <p className="text-sm text-slate-500 mb-4">This is shown to the moderation team next to the report before they decide anything. You can edit it until the report is resolved.</p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-4">
              <p className="text-sm font-semibold text-slate-700">Reason: {REASON_LABEL[responding.reason] ?? responding.reason}</p>
              {responding.post && <p className="text-xs text-slate-500 mt-0.5">Post: "{responding.post.title}"</p>}
            </div>
            <textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              rows={4}
              maxLength={2000}
              autoFocus
              placeholder="Explain what happened from your point of view…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setResponding(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={submitResponse} disabled={submitting || !responseText.trim()} className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer">
                {submitting ? 'Saving…' : 'Save response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal modal */}
      {appealing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAppealing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">Appeal warning</h3>
            <p className="text-sm text-slate-500 mb-4">Explain why you believe this warning was issued in error. You can appeal each warning only once.</p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5 mb-4">
              <p className="text-sm font-semibold text-slate-700">{appealing.reason}</p>
              {appealing.note && <p className="text-xs text-slate-500 mt-0.5">{appealing.note}</p>}
            </div>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={4}
              maxLength={2000}
              autoFocus
              placeholder="Write your explanation…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAppealing(null)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={submitAppeal} disabled={submitting || !explanation.trim()} className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer">
                {submitting ? 'Submitting…' : 'Submit appeal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
