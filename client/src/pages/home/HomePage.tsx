import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/common/Navbar';
import CreatePostModal from '../../components/common/CreatePostModal';
import { useAuth } from '../../hooks/useAuth';
import {
  getFeed, toggleLike, deletePost, editPost,
  createComment, getComments, likeComment, deleteComment,
  reportPost, getPostReports,
  Post, Comment, Report,
} from '../../services/postService';
import { getTrending, getSuggestions, sendRequest, getConnectionStatus, UserStub } from '../../services/socialService';
import WhoLikedModal from '../../components/common/WhoLikedModal';
import { sharePost, getSinglePost } from '../../services/postService';
import { useSocket } from '../../hooks/useSocket';

const LIMIT = 10;


// ─── Skeletons ───────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200 rounded-full w-36" />
            <div className="h-3 bg-slate-100 rounded-full w-24" />
          </div>
        </div>
        <div className="space-y-2.5 mb-4">
          <div className="h-4 bg-slate-200 rounded-full w-3/4" />
          <div className="h-3 bg-slate-100 rounded-full" />
          <div className="h-3 bg-slate-100 rounded-full w-5/6" />
          <div className="h-3 bg-slate-100 rounded-full w-2/3" />
        </div>
        <div className="h-52 bg-slate-100 rounded-xl" />
      </div>
      <div className="px-5 py-3 border-t border-slate-100 flex gap-4">
        <div className="h-6 bg-slate-100 rounded-full w-16" />
        <div className="h-6 bg-slate-100 rounded-full w-20" />
        <div className="h-6 bg-slate-100 rounded-full w-14 ml-auto" />
      </div>
    </div>
  );
}

// ─── EditPostModal ────────────────────────────────────────────────────────────

export function EditPostModal({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: (p: Post) => void }) {
  const [title, setTitle]             = useState(post.title);
  const [description, setDescription] = useState(post.description);
  const [visibility, setVisibility]   = useState<'public' | 'private'>(post.visibility);
  const [keepIds, setKeepIds]         = useState<string[]>(post.media.map(m => m.publicId));
  const [newFiles, setNewFiles]       = useState<File[]>([]);
  const [loading, setLoading]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('description', description); fd.append('visibility', visibility);
      fd.append('keepMediaIds', JSON.stringify(keepIds));
      newFiles.forEach(f => fd.append('media', f));
      const res = await editPost(post.id, fd);
      onSaved(res.data.data); toast.success('Post updated!'); onClose();
    } catch { toast.error('Failed to update post'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Edit post</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg">×</button>
        </div>
        <div className="p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          <div className="flex gap-2">
            {(['public','private'] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)} className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${visibility===v?'bg-slate-900 text-white border-slate-900':'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {v==='public'?'🌍 Public':'🔒 Only me'}
              </button>
            ))}
          </div>
          {post.media.length>0&&(<div><p className="text-xs font-semibold text-slate-500 mb-2">Current media — click to remove</p><div className="flex flex-wrap gap-2">{post.media.map(m=>(<div key={m.publicId} onClick={()=>setKeepIds(ids=>ids.includes(m.publicId)?ids.filter(i=>i!==m.publicId):[...ids,m.publicId])} className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${keepIds.includes(m.publicId)?'border-slate-200':'border-red-400 opacity-40'}`}>{m.type==='image'?<img src={m.url} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full bg-slate-100 flex items-center justify-center text-xl">{m.type==='video'?'🎬':m.type==='audio'?'🎵':'📄'}</div>}</div>))}</div></div>)}
          <div>
            <button onClick={()=>fileRef.current?.click()} className="text-xs font-semibold text-blue-600 hover:underline">+ Add more files</button>
            <input ref={fileRef} type="file" multiple hidden onChange={e=>setNewFiles(prev=>[...prev,...Array.from(e.target.files??[])])} />
            {newFiles.length>0&&<p className="text-xs text-slate-400 mt-1">{newFiles.length} new file(s) queued</p>}
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-50">{loading?'Saving…':'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ReportModal ──────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { value: 'spam',           label: '🚫 Spam' },
  { value: 'harassment',     label: '😡 Harassment' },
  { value: 'misinformation', label: '❌ Misinformation' },
  { value: 'inappropriate',  label: '⚠️ Inappropriate content' },
  { value: 'copyright',      label: '©️ Copyright violation' },
  { value: 'other',          label: '📝 Other' },
];

export function ReportModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [evidence,    setEvidence]    = useState<File[]>([]);
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!reason) return toast.error('Please select a reason');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('reason', reason);
      fd.append('description', description);
      evidence.forEach(f => fd.append('evidence', f));
      await reportPost(post.id, fd);
      toast.success("Report submitted. We\'ll review it shortly.");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit report');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H9.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>
            </div>
            <h2 className="font-bold text-slate-900 text-base">Report post</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg transition-colors">×</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Help us understand the problem. This report is anonymous.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason <span className="text-red-400">*</span></label>
            <div className="relative">
              <select value={reason} onChange={e=>setReason(e.target.value)} className="w-full appearance-none pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer">
                <option value="">Select a reason…</option>
                {REPORT_REASONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Additional details <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the issue in more detail…" rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none placeholder-slate-300"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Evidence <span className="text-slate-400 font-normal">(optional screenshots)</span></label>
            <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span className="text-sm text-slate-400">{evidence.length>0?`${evidence.length} file(s) selected`:'Upload screenshots'}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={e=>setEvidence(Array.from(e.target.files??[]))}/>
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading||!reason} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">{loading?'Submitting…':'Submit report'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── ReportsViewerModal ───────────────────────────────────────────────────────

export function ReportsViewerModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [reports,setReports] = useState<Report[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    getPostReports(post.id).then(res=>setReports(res.data.data.reports)).catch(()=>toast.error('Could not load reports')).finally(()=>setLoading(false));
  },[post.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Reports on your post</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading?<div className="flex justify-center py-8"><svg className="animate-spin w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg></div>
          :reports.length===0?<p className="text-center text-slate-400 text-sm py-8">No reports yet</p>
          :<div className="space-y-3">{reports.map(r=>(
            <div key={r.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{(r.reportedBy.firstName?.[0]??r.reportedBy.email?.[0]??'?').toUpperCase()}</div>
                <span className="text-sm font-semibold text-slate-800">{r.reportedBy.firstName?`${r.reportedBy.firstName} ${r.reportedBy.lastName??''}`.trim():r.reportedBy.email}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${r.status==='pending'?'bg-amber-50 text-amber-700 border-amber-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.status}</span>
              </div>
              <p className="text-xs font-semibold text-red-600 capitalize mb-1">Reason: {r.reason.replace('_',' ')}</p>
              {r.description&&<p className="text-sm text-slate-600">{r.description}</p>}
              {r.evidenceUrls?.length>0&&<div className="mt-2 flex gap-1.5">{r.evidenceUrls.map((url,i)=><img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200"/>)}</div>}
            </div>
          ))}</div>}
        </div>
      </div>
    </div>
  );
}


// ─── ShareModal ────────────────────────────────────────────────────────────────

function ShareModal({ post, onClose, currentUserId, onShared }: { post: Post; onClose: () => void; currentUserId: string; onShared?: () => void }) {
  const [searchQ,    setSearchQ]    = useState('');
  const [results,    setResults]    = useState<{_id:string;firstName?:string;lastName?:string;profilePicture?:string;headline?:string}[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [sent,       setSent]       = useState<string[]>([]);
  const [copied,     setCopied]     = useState(false);
  const url = `${window.location.origin}/?post=${post.id}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    onShared?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await (await import('../../services/socialService')).search(q);
      setResults(res.data.data.users ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const handleSend = async (userId: string) => {
    try {
      const { startConversation, sendMessage } = await import('../../services/socialService');
      const res = await startConversation(userId);
      const convId = res.data.data._id;
      // if active convo, send directly; if pending, send after accept
      await sendMessage(convId, `Check out this post: "${post.title}" ${url}`);
      setSent(prev => [...prev, userId]);
    } catch {
      // Conversation pending or not active — still notify
      setSent(prev => [...prev, userId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Share post</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Copy link */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Copy link</p>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 truncate">{url}</div>
              <button onClick={handleCopy} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Search people */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Send to someone</p>
            <input
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search people by name…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            {searching && <p className="text-xs text-slate-400 mt-2 text-center">Searching…</p>}
            {results.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {results.filter(u => u._id !== currentUserId).map(u => {
                  const name = u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'User';
                  const isSent = sent.includes(u._id);
                  return (
                    <div key={u._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      {u.profilePicture
                        ? <img src={u.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                        : <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{name[0]?.toUpperCase()}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                        {u.headline && <p className="text-xs text-slate-400 truncate">{u.headline}</p>}
                      </div>
                      <button
                        onClick={() => !isSent && handleSend(u._id)}
                        disabled={isSent}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${isSent ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        {isSent ? '✓ Sent' : 'Send'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {searchQ && !searching && results.length === 0 && (
              <p className="text-xs text-slate-400 mt-2 text-center">No people found for "{searchQ}"</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────────

function SingleComment({
  comment, currentUserId, postId, depth = 0
}: {
  comment: Comment & { replies?: Comment[] };
  currentUserId: string;
  postId: string;
  depth?: number;
}) {
  const [replyText,   setReplyText]   = useState('');
  const [showReply,   setShowReply]   = useState(false);
  const [replies,     setReplies]     = useState<Comment[]>(comment.replies ?? []);
  const [liked,       setLiked]       = useState(comment.likedByMe);
  const [likesCount,  setLikesCount]  = useState(comment.likesCount);
  const [submitting,  setSubmitting]  = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const navigate = useNavigate();

  const name = comment.author.firstName
    ? `${comment.author.firstName} ${comment.author.lastName ?? ''}`.trim()
    : 'User';

  const goToAuthor = () => navigate(`/profile/${comment.author.id}`);

  const handleLike = async () => {
    try {
      setLiked(l => !l);
      setLikesCount(c => liked ? c - 1 : c + 1);
      await likeComment(comment.id);
    } catch { setLiked(l => !l); setLikesCount(c => liked ? c + 1 : c - 1); }
  };

  const handleDelete = async () => {
    try { await deleteComment(comment.id); } catch { toast.error('Could not delete'); }
  };

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await getComments(postId, { parentId: comment.id, limit: 50 });
      setReplies(res.data.data.comments);
      setShowReplies(true);
    } catch { toast.error('Could not load replies'); }
    finally { setLoadingReplies(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await createComment(postId, { text: replyText.trim(), parentId: comment.id });
      setReplies(prev => [...prev, res.data.data]);
      setShowReplies(true);
      setReplyText('');
      setShowReply(false);
      toast.success('Reply posted!');
    } catch { toast.error('Failed to post reply'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className={depth > 0 ? 'ml-10 mt-2' : ''}>
      <div className="flex gap-2.5">
        <div onClick={goToAuthor} className="flex-shrink-0 mt-0.5 cursor-pointer" title={`View ${name}'s profile`}>
          {comment.author.profilePicture
            ? <img src={comment.author.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 hover:ring-2 hover:ring-blue-200 transition-all"/>
            : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-blue-200 transition-all">{name[0]?.toUpperCase()}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <p onClick={goToAuthor} className="text-xs font-semibold text-slate-800 leading-tight cursor-pointer hover:text-blue-600 transition-colors inline-block">{name}</p>
            <p className="text-sm text-slate-700 leading-relaxed mt-0.5 whitespace-pre-wrap">{comment.text}</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5 px-1">
            {/* Thumbs up like button — proper SVG icon */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors ${liked ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
            >
              <svg className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
              </svg>
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
            {depth === 0 && (
              <button onClick={() => setShowReply(r => !r)} className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">
                Reply
              </button>
            )}
            {comment.author.id === currentUserId && (
              <button onClick={handleDelete} className="text-xs font-semibold text-slate-300 hover:text-red-500 transition-colors">Delete</button>
            )}
            <span className="text-[10px] text-slate-300 ml-auto">{new Date(comment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>

          {/* Reply input */}
          {showReply && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder="Write a reply…"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button onClick={handleReply} disabled={submitting || !replyText.trim()} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl disabled:opacity-40">
                {submitting ? '…' : 'Reply'}
              </button>
            </div>
          )}

          {/* Load / show replies */}
          {depth === 0 && (
            <>
              {!showReplies && (
                <button onClick={loadReplies} disabled={loadingReplies} className="mt-1.5 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">
                  {loadingReplies ? 'Loading…' : 'View replies'}
                </button>
              )}
              {showReplies && replies.map(r => (
                <SingleComment key={r.id} comment={r} currentUserId={currentUserId} postId={postId} depth={1} />
              ))}
              {showReplies && replies.length > 0 && (
                <button onClick={() => setShowReplies(false)} className="mt-1 text-xs text-slate-400 hover:text-slate-600">Hide replies</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const COMMENTS_PER_PAGE = 10;

function CommentSection({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const [comments,   setComments]   = useState<Comment[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getComments(postId, { limit: COMMENTS_PER_PAGE, page: p });
      const data = res.data.data;
      setComments(data.comments);
      setTotal(data.total);
      setPages(Math.ceil(data.total / COMMENTS_PER_PAGE));
      setPage(p);
    } catch { toast.error('Could not load comments'); }
    finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { load(1); }, [load]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await createComment(postId, { text: text.trim() });
      setText('');
      toast.success('Comment posted!');
      load(1);
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3 rounded-b-2xl">
      {/* Comment input */}
      <div className="flex gap-2.5">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Write a comment… (Enter to post)"
          rows={1}
          className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none bg-white"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40 self-end transition-colors"
        >
          {submitting ? '…' : 'Post'}
        </button>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400 py-2 text-center">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <SingleComment key={c.id} comment={c} currentUserId={currentUserId} postId={postId} />
          ))}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">{total} comment{total !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-100 transition-colors">←</button>
                <span className="text-xs text-slate-500 px-2">{page} / {pages}</span>
                <button onClick={() => load(page + 1)} disabled={page >= pages} className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-100 transition-colors">→</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── PostCard ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  jobseeker: 'bg-blue-50 text-blue-700 border-blue-200',
  recruiter: 'bg-purple-50 text-purple-700 border-purple-200',
  student:   'bg-amber-50 text-amber-700 border-amber-200',
};

const WORK_STATUS_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  open_to_work:     { label: 'Open to work',     icon: '🟢', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  currently_hiring: { label: 'Currently hiring', icon: '💼', cls: 'bg-purple-50  text-purple-700  border-purple-200'  },
  none:             { label: '',                  icon: '',   cls: ''                                                   },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function PostCard({
  post,
  currentUserId,
  onLike,
  onDelete,
  onEdit,
  onReport,
  onViewReports,
  onExpand,
  onConnect,
}: {
  post: Post;
  currentUserId: string;
  onLike(id: string): void;
  onDelete(id: string): void;
  onEdit(post: Post): void;
  onReport(post: Post): void;
  onViewReports(post: Post): void;
  onExpand(post: Post): void;
  onConnect(authorId: string): void;
}) {
  const navigate    = useNavigate();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [expanded,      setExpanded]      = useState(false);
  const [lightbox,      setLightbox]      = useState<number | null>(null);
  const [showComments,  setShowComments]  = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWhoLiked,   setShowWhoLiked]   = useState(false);
  const [sharesCount,    setSharesCount]    = useState(post.sharesCount ?? 0);
  const isOwner    = post.author.id === currentUserId;
  const isSuspended = post.status === 'suspended';
  const authorName = post.author.firstName
    ? `${post.author.firstName} ${post.author.lastName ?? ''}`.trim()
    : 'Unknown';

  const ws    = post.author.workStatus ?? 'none';
  const wsCfg = WORK_STATUS_CONFIG[ws];
  const CLAMP = 300;

  const mediaCount = post.media.length;
  const gridClass  =
    mediaCount === 1 ? 'grid-cols-1' :
    mediaCount === 2 ? 'grid-cols-2' :
    mediaCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

  if (isSuspended && !isOwner) return null;

  const handleShare = () => setShowShareModal(true);

  return (
    <article className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 ${isSuspended ? 'border border-amber-200 shadow-sm opacity-90' : 'border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'}`}>

      {/* Suspended banner */}
      {isSuspended && isOwner && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 leading-tight">Post suspended by admin</p>
            {post.adminNote && <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">{post.adminNote}</p>}
          </div>
        </div>
      )}

      {/* Author row */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${post.author.id}`)} title={`View ${authorName}'s profile`}>
            {post.author.profilePicture
              ? <img src={post.author.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" />
              : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-sm">{authorName[0]?.toUpperCase() ?? '?'}</div>
            }
            {ws === 'open_to_work' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full ring-2 ring-white" title="Open to work" />}
            {ws === 'currently_hiring' && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-purple-400 rounded-full ring-2 ring-white" title="Hiring" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span onClick={() => navigate(`/profile/${post.author.id}`)} className="font-semibold text-slate-900 text-sm leading-tight hover:text-blue-600 transition-colors cursor-pointer">{authorName}</span>
              {post.author.role && post.author.role !== 'user' && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize tracking-wide ${ROLE_BADGE[post.author.role] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>{post.author.role}</span>
              )}
              {post.visibility === 'private' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-0.5">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                  Only me
                </span>
              )}
            </div>
            {post.author.headline && <p onClick={() => navigate(`/profile/${post.author.id}`)} className="text-xs text-slate-500 mt-0.5 truncate leading-tight cursor-pointer">{post.author.headline}</p>}
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {isOwner ? (
          <div className="relative flex-shrink-0 ml-2">
            <button onClick={() => setMenuOpen(p => !p)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20 py-1">
                {!isSuspended && (
                  <button onClick={() => { setMenuOpen(false); onEdit(post); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Edit post
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); onViewReports(post); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  View reports {post.reportCount ? <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{post.reportCount}</span> : null}
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button onClick={() => { setMenuOpen(false); onDelete(post.id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Delete post
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => onConnect(post.author.id)} className="text-xs font-bold px-3 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex-shrink-0">
              + Connect
            </button>
            <button onClick={() => onReport(post)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all" title="Report this post">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H9.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Title + Description */}
      <div className="px-5 pb-3">
        <h3 onClick={() => onExpand(post)} className="font-bold text-slate-900 text-base leading-snug mb-1.5 tracking-tight cursor-pointer hover:text-blue-700 transition-colors">{post.title}</h3>
        <p className={`text-slate-600 text-sm leading-relaxed whitespace-pre-wrap ${!expanded && post.description.length > CLAMP ? 'line-clamp-4' : ''}`}>
          {post.description}
        </p>
        {post.description.length > CLAMP && (
          <button onClick={() => setExpanded(p => !p)} className="mt-1 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">
            {expanded ? 'Show less' : '…see more'}
          </button>
        )}
      </div>

      {/* Media */}
      {post.media.length > 0 && (
        <>
          <div className={`px-5 pb-3 grid gap-1 ${gridClass}`}>
            {post.media.slice(0, 4).map((m, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden bg-slate-100 group"
                style={{ aspectRatio: mediaCount === 1 ? '16/9' : '1', cursor: m.type === 'image' ? 'pointer' : 'default' }}
                onClick={() => m.type === 'image' && setLightbox(i)}
              >
                {m.type === 'image'
                  ? <img src={m.url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  : m.type === 'video'
                  ? <video src={m.url} controls className="w-full h-full object-cover" onClick={e => e.stopPropagation()} />
                  : m.type === 'audio'
                  ? <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-slate-50">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"><span className="text-2xl">🎵</span></div>
                      <audio src={m.url} controls className="w-full" />
                    </div>
                  : <a href={m.url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 hover:bg-slate-200 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><span className="text-2xl">📄</span></div>
                      <span className="text-xs font-medium text-slate-600 text-center break-all line-clamp-2">{m.originalName || 'Document'}</span>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Download</span>
                    </a>
                }
                {i === 3 && post.media.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                    <span className="text-white font-bold text-2xl">+{post.media.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Image lightbox */}
          {lightbox !== null && (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
              <img src={post.media[lightbox].url} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
              <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm transition-colors">×</button>
              {post.media.length > 1 && <>
                <button onClick={e => { e.stopPropagation(); setLightbox(p => ((p ?? 0) - 1 + post.media.length) % post.media.length); }} className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors text-lg">‹</button>
                <button onClick={e => { e.stopPropagation(); setLightbox(p => ((p ?? 0) + 1) % post.media.length); }} className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors text-lg">›</button>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {post.media.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === lightbox ? 'bg-white' : 'bg-white/40'}`} />)}
                </div>
              </>}
            </div>
          )}
        </>
      )}

      {/* Actions row */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-1">
        <div className={`flex items-center rounded-xl transition-all ${post.likedByMe ? 'text-red-500 bg-red-50' : 'text-slate-500'}`}>
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 text-sm font-semibold pl-3 pr-1.5 py-1.5 rounded-l-xl transition-all cursor-pointer ${post.likedByMe ? '' : 'hover:text-red-500 hover:bg-red-50'}`}
          >
            <svg className="w-[18px] h-[18px]" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span className="hidden sm:inline">Like</span>
          </button>
          {/* Clickable like COUNT — opens the "who liked" list */}
          {post.likesCount > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setShowWhoLiked(true); }}
              className="text-sm font-bold pr-3 pl-1 py-1.5 rounded-r-xl hover:underline cursor-pointer"
              title="See who liked this"
            >
              {post.likesCount}
            </button>
          )}
        </div>

        <button
          onClick={() => setShowComments(p => !p)}
          className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${showComments ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
          <span>{post.commentCount > 0 ? post.commentCount : ''}</span>
          <span className="hidden sm:inline">Comment</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all ml-auto cursor-pointer"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
          {sharesCount > 0 && <span className="font-bold">{sharesCount}</span>}
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} currentUserId={currentUserId} />}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          onClose={() => setShowShareModal(false)}
          currentUserId={currentUserId}
          onShared={() => { sharePost(post.id).then(r => setSharesCount(r.data.data.sharesCount)).catch(() => setSharesCount(c => c + 1)); }}
        />
      )}

      {/* Who liked */}
      {showWhoLiked && <WhoLikedModal postId={post.id} onClose={() => setShowWhoLiked(false)} />}
    </article>
  );
}


// ─── Left sidebar ─────────────────────────────────────────────────────────────

function ProfileSidebar({
  user,
}: {
  user: ReturnType<typeof useAuth>['user'];
}) {
  const navigate = useNavigate();

  // The auth store only carries a slim user object (no coverPicture, and its
  // profilePicture can be stale). Fetch the fresh full profile so the sidebar
  // always shows the current cover image + profile picture, like LinkedIn.
  const [full, setFull] = useState<{ coverPicture?: string; profilePicture?: string; headline?: string; firstName?: string; lastName?: string } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    import('../../services/profileService')
      .then(({ getProfile }) => getProfile(user.id))
      .then(r => setFull(r.data.data))
      .catch(() => {});
  }, [user?.id]);

  const name = (full?.firstName ?? user?.firstName)
    ? `${full?.firstName ?? user?.firstName} ${full?.lastName ?? user?.lastName ?? ''}`.trim()
    : user?.email ?? 'User';

  const cover  = full?.coverPicture;
  const avatar = full?.profilePicture ?? user?.profilePicture;

  const ws = user?.workStatus ?? 'none';
  const wsCfg = WORK_STATUS_CONFIG[ws];
  const goProfile = () => navigate(`/profile/${user?.id}`);

  return (
    <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-20">
      {/* Cover image with circular profile picture overlapping it */}
      <div className="h-24 relative cursor-pointer" onClick={goProfile} title="View my profile">
        {cover
          ? <img src={cover} alt="" className="w-full h-full object-cover"/>
          : <div className="h-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500">
              <div className="absolute inset-0 opacity-30" style={{backgroundImage:'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)'}} />
            </div>
        }
        {/* subtle bottom fade so the avatar ring pops on any cover */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Circular avatar — centered, sitting on top of the cover */}
      <div className="flex justify-center -mt-10 relative z-10">
        <button onClick={goProfile} className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer" title="View my profile">
          {avatar
            ? <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg hover:shadow-xl transition-shadow" />
            : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-white flex items-center justify-center font-bold text-2xl border-4 border-white shadow-lg">
                {name[0]?.toUpperCase() ?? 'U'}
              </div>
          }
        </button>
      </div>

      {/* Identity — centered like a professional profile card */}
      <div className="text-center px-4 pt-2.5 pb-4">
        <p className="font-bold text-slate-900 text-[15px] leading-tight cursor-pointer hover:text-blue-600 transition-colors" onClick={goProfile}>{name}</p>
        {full?.headline
          ? <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{full.headline}</p>
          : user?.email && <p className="text-xs text-slate-400 truncate mt-1">{user.email}</p>}
        {ws !== 'none' && (
          <span className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${wsCfg.cls}`}>
            {wsCfg.icon} {wsCfg.label}
          </span>
        )}
      </div>

      {/* Quick links */}
      <div className="border-t border-slate-100 px-4 py-3 space-y-0.5">
        {[
          { label: 'My Profile', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>, href: user ? `/profile/${user?.id}` : '/profile' },
          { label: 'Connections', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, href: '/connections' },
          { label: 'AI Mock Interview', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v3M12 17v4"/></svg>, href: '/ai-interview' },
        ].map(({ label, icon, href }) => (
          <a key={label} href={href} className="flex items-center gap-3 py-2 px-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all group">
            <span className="text-slate-400 group-hover:text-slate-600 transition-colors">{icon}</span>
            <span className="font-medium">{label}</span>
            <svg className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </a>
        ))}
      </div>
    </aside>
  );
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

function TrendingSidebar({
  trending, suggestions, onConnect,
}: {
  trending: { tag: string; count: number }[];
  suggestions: UserStub[];
  onConnect: (id: string) => void;
}) {
  const navigate = useNavigate();
  const _trending = trending; // real data from API — no static fallback

  return (
    <aside className="space-y-3 sticky top-20">
      {/* Trending */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/></svg>
            Trending now
          </h3>
        </div>
        <div className="px-4 py-2 divide-y divide-slate-50">
          {_trending.map(({ tag, count }, i) => (
            <button key={tag} className="w-full text-left py-2.5 group">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">#{i + 1} trending</p>
              <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors mt-0.5">{tag}</p>
              <p className="text-xs text-slate-400 mt-0.5">{count} posts</p>
            </button>
          ))}
        </div>
      </div>

      {/* People you may know */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            People you may know
          </h3>
        </div>
        <div className="px-4 py-2 divide-y divide-slate-50">
          {suggestions.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">No suggestions right now</p>
            : suggestions.slice(0, 4).map(u => {
                const name = u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'User';
                const initials = (u.firstName?.[0] ?? '?').toUpperCase();
                return (
                  <div key={u._id} className="flex items-center gap-3 py-3">
                    <div onClick={() => navigate(`/profile/${u._id}`)} className="flex-shrink-0 cursor-pointer" title={`View ${name}'s profile`}>
                      {u.profilePicture
                        ? <img src={u.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover hover:ring-2 hover:ring-blue-200 transition-all"/>
                        : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-blue-200 transition-all">{initials}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${u._id}`)}>
                      <p className="text-sm font-semibold text-slate-800 leading-tight truncate hover:text-blue-600 transition-colors">{name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.headline ?? u.role ?? 'Member'}</p>
                    </div>
                    <button onClick={() => onConnect(u._id)} className="text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-full px-3 py-1 transition-all flex-shrink-0">
                      + Connect
                    </button>
                  </div>
                );
              })
          }
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">Show all suggestions →</button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-300 text-center px-4 leading-relaxed">
        NextHire · Privacy · Terms · Help · 2025
      </p>
    </aside>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';

  // Deep link: /?post=<id> opens that post's detail popup (share links, notifications)
  const deepLinkPostId = searchParams.get('post');
  useEffect(() => {
    if (!deepLinkPostId) return;
    getSinglePost(deepLinkPostId)
      .then(r => setSelectedPost(r.data.data))
      .catch(() => toast.error('Post not found or removed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPostId]);
  const [posts,          setPosts]          = useState<Post[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [page,           setPage]           = useState(1);
  const [pages,          setPages]          = useState(1);
  const [showModal,      setShowModal]      = useState(false);
  const [editingPost,    setEditingPost]    = useState<Post | null>(null);
  const [reportingPost,  setReportingPost]  = useState<Post | null>(null);
  const [viewingReports, setViewingReports] = useState<Post | null>(null);
  const [selectedPost,   setSelectedPost]   = useState<Post | null>(null);  // post popup
  const [workStatus,     setWorkStatusUI]   = useState<string>(user?.workStatus ?? 'none');
  const [wsLoading,      setWsLoading]      = useState(false);
  const [trending,       setTrending]       = useState<{ tag: string; count: number }[]>([]);
  const [suggestions,    setSuggestions]    = useState<UserStub[]>([]);

  // Real-time socket updates
  useSocket({
    new_post: (post: unknown) => {
      const p = post as Post;
      if (p.author?.id !== user?.id) {
        setPosts(prev => [p, ...prev.filter(x => x.id !== p.id)]);
      }
    },
    post_updated: (post: unknown) => {
      const p = post as Post;
      setPosts(prev => prev.map(x => x.id === p.id ? p : x));
    },
    post_deleted: (data: unknown) => {
      const { postId } = data as { postId: string };
      setPosts(prev => prev.filter(x => x.id !== postId));
    },
  });

  const loadFeed = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res  = await getFeed(p, LIMIT, searchQuery);
      const data = res.data.data;
      setPosts(data.posts);
      setPage(data.page);
      setPages(data.pages);
    } catch {
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Load real sidebar data on mount
  useEffect(() => {
    getTrending().then(r => setTrending(r.data.data ?? [])).catch(() => {});
    getSuggestions().then(r => setSuggestions(r.data.data ?? [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadFeed(1); }, [loadFeed]);

  // Pagination is explicit - no infinite scroll observer needed

  const handleLike = async (postId: string) => {
    try {
      const res     = await toggleLike(postId);
      const updated = res.data.data;
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
    } catch {
      toast.error('Could not update like');
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Could not delete post');
    }
  };

  const handlePostSaved = (updated: Post) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleConnect = async (targetId: string) => {
    try {
      await sendRequest(targetId);
      setSuggestions(prev => prev.filter(s => s._id !== targetId));
      toast.success('Connection request sent!');
    } catch { toast.error('Could not send request'); }
  };


  const avatar = user?.profilePicture
    ? <img src={user.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0" />
    : <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
        {(user?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
      </div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-5">

          {/* ── Left sidebar (hidden on mobile) ── */}
          <div className="hidden lg:block sticky top-20 self-start">
            <ProfileSidebar user={user} />
          </div>

          {/* ── Centre feed ── */}
          <div className="space-y-4 min-w-0">

            {/* Search indicator */}
            {searchQuery && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                <p className="text-sm text-blue-700 font-medium">
                  <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
                  Results for "<span className="font-bold">{searchQuery}</span>"
                </p>
                <button onClick={() => window.history.pushState({}, '', '/')} className="text-xs text-blue-500 hover:text-blue-700 font-semibold">Clear</button>
              </div>
            )}

            {/* Create post trigger */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                {avatar}
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 text-left text-sm text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-5 py-2.5 transition-all hover:border-slate-300 font-medium"
                >
                  Share something with the community…
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                {[
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, label: 'Photo/Video', color: 'text-emerald-600 hover:bg-emerald-50' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>, label: 'Document', color: 'text-orange-600 hover:bg-orange-50' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, label: 'Job opportunity', color: 'text-blue-600 hover:bg-blue-50' },
                ].map(({ icon, label, color }) => (
                  <button key={label} onClick={() => setShowModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 ${color} transition-all flex-1 justify-center`}>
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>


                        {/* Feed */}
            {loading
              ? Array(3).fill(0).map((_, i) => <PostSkeleton key={i} />)
              : posts.length === 0
                ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-14 text-center shadow-sm">
                    <p className="text-3xl mb-3">✨</p>
                    <h3 className="font-bold text-slate-800 mb-1">No posts yet</h3>
                    <p className="text-slate-500 text-sm mb-4">Be the first to share something with the community.</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
                    >
                      Create first post
                    </button>
                  </div>
                )
                : posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id ?? ''}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    onEdit={setEditingPost}
                    onReport={setReportingPost}
                    onViewReports={setViewingReports}
                    onExpand={setSelectedPost}
                    onConnect={async (authorId) => {
                      try { await sendRequest(authorId); toast.success('Connection request sent!'); }
                      catch { toast.error('Could not send request'); }
                    }}
                  />
                ))
            }

            {/* Pagination — always shown */}
            {posts.length > 0 && (
              <div className="flex items-center justify-between pt-2 pb-1">
                <span className="text-xs text-slate-400">Page {page} of {pages}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setPage(p => p - 1); loadFeed(page - 1); window.scrollTo({top:0,behavior:'smooth'}); }}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-colors"
                  >← Prev</button>
                  {Array.from({length: Math.min(5, pages)}, (_, i) => {
                    const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => { setPage(p); loadFeed(p); window.scrollTo({top:0,behavior:'smooth'}); }}
                        className={`w-8 h-8 text-xs font-bold rounded-xl transition-colors ${p === page ? 'bg-slate-900 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                      >{p}</button>
                    );
                  })}
                  <button
                    onClick={() => { setPage(p => p + 1); loadFeed(page + 1); window.scrollTo({top:0,behavior:'smooth'}); }}
                    disabled={page >= pages}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-colors"
                  >Next →</button>
                </div>
              </div>
            )}


          </div>

          {/* ── Right sidebar (hidden on mobile) ── */}
          <div className="hidden lg:block sticky top-20 self-start">
            <TrendingSidebar trending={trending} suggestions={suggestions} onConnect={handleConnect} />
          </div>

        </div>
      </main>

      {/* Create post modal */}
      {showModal && (
        <CreatePostModal
          onClose={() => setShowModal(false)}
          onCreated={post => setPosts(prev => [post, ...prev])}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={handlePostSaved}
        />
      )}

      {reportingPost && (
        <ReportModal
          post={reportingPost}
          onClose={() => setReportingPost(null)}
        />
      )}

      {viewingReports && (
        <ReportsViewerModal
          post={viewingReports}
          onClose={() => setViewingReports(null)}
        />
      )}

      {/* Post popup / detail modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-900 text-base">{selectedPost.title}</h3>
              <button onClick={() => setSelectedPost(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg">×</button>
            </div>
            <PostCard
              post={selectedPost}
              currentUserId={user?.id ?? ''}
              onLike={id => { handleLike(id); setSelectedPost(prev => prev ? { ...prev, likedByMe: !prev.likedByMe, likesCount: prev.likedByMe ? prev.likesCount - 1 : prev.likesCount + 1 } : null); }}
              onDelete={id => { handleDelete(id); setSelectedPost(null); }}
              onEdit={p => { setEditingPost(p); setSelectedPost(null); }}
              onReport={p => { setReportingPost(p); setSelectedPost(null); }}
              onViewReports={p => { setViewingReports(p); setSelectedPost(null); }}
              onExpand={() => {}} // already expanded
              onConnect={async (authorId) => {
                try { await sendRequest(authorId); toast.success('Connection request sent!'); }
                catch { toast.error('Could not send request'); }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
