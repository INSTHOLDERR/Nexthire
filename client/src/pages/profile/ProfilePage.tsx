import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';
import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../hooks/useAuth';
import {
  getProfile, updateBasic, FullUser, Skill, Project, Experience, Education, Language, Contact,
  addSkill, editSkill, deleteSkill,
  addProject, editProject, deleteProject,
  addExperience, editExperience, deleteExperience,
  addEducation, editEducation, deleteEducation,
  addLanguage, editLanguage, deleteLanguage,
  addContact, editContact, deleteContact,
  deactivateAccount, deleteAccount,
  getBlockedUsers, unblockUser, blockUser, reportUser, BlockedUser,
  resumeViewUrl, resumeDownloadUrl,
} from '../../services/profileService';
import { sendRequest, getConnectionStatus, startConversation } from '../../services/socialService';
import { getSinglePost, toggleLike as togglePostLike, deletePost, Post as FeedPost } from '../../services/postService';
import CreatePostModal from '../../components/common/CreatePostModal';
import { EditPostModal, PostCard, ReportModal, ReportsViewerModal } from '../home/HomePage';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostItem {
  _id: string;
  title: string;
  description: string;
  visibility: string;
  status: string;
  likesCount?: number;
  likes?: string[];
  commentCount?: number;
  createdAt: string;
  media?: { url: string; type: string; originalName?: string }[];
  authorId?: { _id: string; firstName?: string; lastName?: string; profilePicture?: string; headline?: string };
}

// ─── Image crop utility ───────────────────────────────────────────────────────

async function getCroppedImg(imageSrc: string, croppedAreaPixels: any): Promise<File> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width  = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
  return new Promise<File>(res => {
    canvas.toBlob(b => { res(new File([b!], 'cropped.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
  });
}

function CropModal({ src, aspectRatio, onDone, onCancel, title }: { src: string; aspectRatio: number; onDone: (f: File) => void; onCancel: () => void; title: string }) {
  const [crop,     setCrop]     = useState({ x: 0, y: 0 });
  const [zoom,     setZoom]     = useState(1);
  const [cropArea, setCropArea] = useState<any>(null);

  const onCropComplete = useCallback((_: any, pix: any) => setCropArea(pix), []);

  const handleDone = async () => {
    try {
      const file = await getCroppedImg(src, cropArea);
      onDone(file);
    } catch { toast.error('Crop failed'); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">×</button>
        </div>
        <div className="relative bg-black" style={{ height: 320 }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={aspectRatio === 1 ? 'round' : 'rect'}
          />
        </div>
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-slate-900"/>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
            <button onClick={handleDone} className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 cursor-pointer">Apply crop</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inp = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-text";
const sel = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white cursor-pointer";

const Btn = ({ children, onClick, variant = 'primary', size = 'sm', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: string; size?: 'sm'|'md'|'lg'; disabled?: boolean }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed';
  const sizes: Record<string,string> = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants: Record<string,string> = { primary: 'bg-slate-900 text-white hover:bg-slate-700', ghost: 'border border-slate-200 text-slate-700 hover:bg-slate-50', danger: 'bg-red-600 text-white hover:bg-red-700', blue: 'bg-blue-600 text-white hover:bg-blue-700', outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50' };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>{children}</button>;
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>{children}</div>;
}

function Section({ title, icon, onAdd, isOwn, empty, children }: { title: string; icon: string; onAdd?: () => void; isOwn: boolean; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900 text-[15px] tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm">{icon}</span>
          {title}
        </h2>
        {isOwn && onAdd && (
          <button onClick={onAdd} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title={`Add ${title}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          </button>
        )}
      </div>
      <div className="px-5 py-4">
        {empty && isOwn ? <button onClick={onAdd} className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">+ Add {title.toLowerCase()}</button>
          : empty ? <p className="text-sm text-slate-400 italic">None listed.</p>
          : children}
      </div>
    </div>
  );
}

// ─── Proficiency styling ──────────────────────────────────────────────────────
const PROF_COLOR: Record<string,string> = {
  beginner:'bg-slate-100 text-slate-600', intermediate:'bg-blue-50 text-blue-700',
  advanced:'bg-purple-50 text-purple-700', expert:'bg-emerald-50 text-emerald-700',
  basic:'bg-slate-100 text-slate-600', conversational:'bg-blue-50 text-blue-700',
  professional:'bg-purple-50 text-purple-700', native:'bg-emerald-50 text-emerald-700',
};

const CONTACT_ICON: Record<string,string> = { whatsapp:'📱', linkedin:'💼', github:'🐙', portfolio:'🌐', twitter:'🐦', instagram:'📷', other:'🔗' };

// ─── Profile strength ─────────────────────────────────────────────────────────
function strength(u: FullUser) {
  let s = 0;
  if (u.firstName) s+=10; if (u.profilePicture) s+=10; if (u.coverPicture) s+=5;
  if (u.headline) s+=10; if (u.about) s+=10; if (u.location) s+=5;
  if (u.skills?.length) s+=10; if (u.experiences?.length) s+=10;
  if (u.educations?.length) s+=10; if (u.projects?.length) s+=10;
  if (u.languages?.length) s+=5; if (u.contacts?.length) s+=5;
  if (u.resumeUrl) s+=5; if ((u.connections?.length??0)>4) s+=5;
  return Math.min(s, 100);
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: me, logout, setCredentials, token } = useAuth();
  const navigate = useNavigate();
  const profileId = userId ?? me?.id ?? '';
  const isOwn = profileId === me?.id;

  const [profile,    setProfile]    = useState<FullUser | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [connStatus, setConnStatus] = useState<'none'|'pending'|'connected'|'received'>('none');
  const [tab,        setTab]        = useState<'profile'|'posts'|'views'>('profile');
  const [posts,      setPosts]      = useState<PostItem[]>([]);
  const [postsPage,  setPostsPage]  = useState(1);
  const [postsPages, setPostsPages] = useState(1);
  const [postsTotal, setPostsTotal] = useState<number | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);

  // Blocked users (own profile — right sidebar)
  const [blocked,       setBlocked]       = useState<BlockedUser[]>([]);
  const [blockedLoaded, setBlockedLoaded] = useState(false);

  // Report-user modal
  const [showReportUser, setShowReportUser] = useState(false);

  // Post management (own profile: create / edit / delete straight from the Posts tab)
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost,    setEditingPost]    = useState<FeedPost | null>(null);

  // Full post popup — opens right here on the profile (no navigation away).
  const [popupPost,      setPopupPost]      = useState<FeedPost | null>(null);
  const [popupLoading,   setPopupLoading]   = useState(false);
  const [reportingPost,  setReportingPost]  = useState<FeedPost | null>(null);
  const [viewingReports, setViewingReports] = useState<FeedPost | null>(null);

  const openPostPopup = async (postId: string) => {
    setPopupLoading(true);
    try {
      const res = await getSinglePost(postId);
      setPopupPost(res.data.data);
    } catch { toast.error('Could not load post'); }
    finally { setPopupLoading(false); }
  };

  // Resume viewer (in-app PDF viewer)
  const [showResume, setShowResume] = useState(false);

  const handleEditPost = async (postId: string) => {
    try {
      const res = await getSinglePost(postId);
      setEditingPost(res.data.data);
    } catch { toast.error('Could not load post for editing'); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await deletePost(postId);
      toast.success('Post deleted');
      loadPosts(postsPage);
    } catch { toast.error('Could not delete post'); }
  };

  // Modal flags
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [editBasic,  setEditBasic]  = useState(false);
  const [editAbout,  setEditAbout]  = useState(false);
  const [editCtx,    setEditCtx]    = useState(false);
  const [skillMod,   setSkillMod]   = useState<Skill|'new'|null>(null);
  const [projMod,    setProjMod]    = useState<Project|'new'|null>(null);
  const [expMod,     setExpMod]     = useState<Experience|'new'|null>(null);
  const [eduMod,     setEduMod]     = useState<Education|'new'|null>(null);
  const [langMod,    setLangMod]    = useState<Language|'new'|null>(null);
  const [contMod,    setContMod]    = useState<Contact|'new'|null>(null);
  const [showDel,    setShowDel]    = useState(false);
  const [showDeact,  setShowDeact]  = useState(false);
  const [viewers,    setViewers]    = useState<any[]>([]);
  const [viewersLoaded, setViewersLoaded] = useState(false);
  const [isBlocked,  setIsBlocked]  = useState(false);

  const refresh = async () => { const r = await getProfile(profileId); setProfile(r.data.data); };

  const loadPosts = async (p = 1) => {
    setPostsLoading(true);
    try {
      const url = isOwn ? '/profile/me/posts' : `/profile/${profileId}/posts`;
      const res = await api.get(url, { params: { page: p } });
      setPosts(res.data.data.posts ?? []);
      setPostsPages(res.data.data.pages ?? 1);
      setPostsTotal(res.data.data.total ?? 0);
      setPostsPage(p);
    } catch { toast.error('Could not load posts'); }
    finally { setPostsLoading(false); }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setTab('profile');
      try {
        const profRes = await getProfile(profileId);
        setProfile(profRes.data.data);
        setIsBlocked(!!profRes.data.data.isBlockedByMe);
        if (!isOwn) {
          try { const cs = await getConnectionStatus(profileId); setConnStatus(cs.data.data.status); } catch {}
        }
      } catch { toast.error('Could not load profile'); }
      finally { setLoading(false); }
    };
    if (profileId) load();
    // Load posts once up-front so the "Posts" stat is accurate
    if (profileId) loadPosts(1);
  }, [profileId]);

  useEffect(() => {
    if (tab === 'views' && !viewersLoaded && isOwn) {
      api.get('/profile/me/viewers').then(r => { setViewers(r.data.data ?? []); setViewersLoaded(true); }).catch(() => {});
    }
  }, [tab]);

  // Blocked users — own profile only
  useEffect(() => {
    if (!isOwn) return;
    getBlockedUsers().then(r => { setBlocked(r.data.data ?? []); setBlockedLoaded(true); }).catch(() => setBlockedLoaded(true));
  }, [isOwn, profileId]);

  const handleUnblock = async (id: string) => {
    try {
      await unblockUser(id);
      setBlocked(prev => prev.filter(b => b._id !== id));
      toast.success('User unblocked');
    } catch { toast.error('Could not unblock user'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="bg-white border border-slate-200 rounded-2xl animate-pulse" style={{height:160}}/>)}
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Profile not found.</p>
      </div>
    </div>
  );

  const name = profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : profile.email;
  const str  = strength(profile);

  // Professional context line (shown under name)
  const ctxLine = (() => {
    if (profile.role === 'student' && profile.school) return `${profile.degree ?? 'Student'} at ${profile.school}${profile.fieldOfStudy ? ` · ${profile.fieldOfStudy}` : ''}`;
    if ((profile.role === 'jobseeker' || profile.role === 'recruiter') && profile.jobTitle) return `${profile.jobTitle}${profile.company ? ` at ${profile.company}` : ''}`;
    return null;
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className={`mx-auto px-4 py-6 ${isOwn ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <div className={`grid grid-cols-1 gap-5 ${isOwn ? 'lg:grid-cols-[1fr_300px]' : ''}`}>
        <div className="space-y-4 min-w-0">

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Cover */}
          <div className="relative h-40 sm:h-52 bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 overflow-hidden group">
            {profile.coverPicture
              ? <img src={profile.coverPicture} alt="" className="w-full h-full object-cover"/>
              : <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.3),transparent_60%)]"/>
            }
            {/* Bottom fade so the avatar and text sit cleanly on any cover */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none"/>
            {isOwn && (
              <button onClick={() => setEditBasic(true)} className="absolute top-3 right-3 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit profile
              </button>
            )}
          </div>

          <div className="px-5 sm:px-6 pb-5">
            {/* Avatar + action buttons */}
            <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-3">
              <div className="relative">
                {profile.profilePicture
                  ? <img src={profile.profilePicture} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl ring-1 ring-slate-200"/>
                  : <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center text-4xl font-bold border-4 border-white shadow-xl ring-1 ring-slate-200">
                      {name[0]?.toUpperCase() ?? '?'}
                    </div>
                }
                {profile.workStatus === 'open_to_work'     && <span className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-emerald-400 rounded-full ring-[3px] ring-white" title="Open to work"/>}
                {profile.workStatus === 'currently_hiring' && <span className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-purple-400 rounded-full ring-[3px] ring-white" title="Currently hiring"/>}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end mt-14">
                {/* Resume: visible on any profile that has one.
                    View  → clean url, opens the PDF inline in a new tab.
                    Download → url with fl_attachment, forces download with the original filename. */}
                {profile.resumeUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowResume(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      View Resume
                    </button>
                    <a
                      href={resumeDownloadUrl(profile.resumeUrl, profile.resumeOriginalName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Download
                    </a>
                  </div>
                )}
                {isOwn ? (
                  <>
                    <Btn variant="ghost" size="sm" onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url).then(() => toast.success('Profile link copied!'));
                    }}>🔗 Share</Btn>
                  </>
                ) : (
                  <>
                    {connStatus === 'none'      && <Btn variant="blue"    size="sm" onClick={async () => { await sendRequest(profileId); setConnStatus('pending'); toast.success('Request sent!'); }}>+ Connect</Btn>}
                    {connStatus === 'pending'   && <Btn variant="ghost"   size="sm" disabled>Requested ✓</Btn>}
                    {connStatus === 'connected' && <Btn variant="ghost"   size="sm" disabled>Connected ✓</Btn>}
                    {/* Message button available to all authenticated users */}
                    <Btn variant="outline" size="sm" onClick={async () => { try { await startConversation(profileId); navigate(`/messages?user=${profileId}`); } catch { toast.error('Could not start conversation'); } }}>
                      💬 Message
                    </Btn>
                    {/* Block / Report */}
                    <div className="relative group">
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button onClick={async () => {
                          try {
                            if (isBlocked) { await unblockUser(profileId); toast.success('User unblocked'); }
                            else           { await blockUser(profileId);   toast.success('User blocked'); }
                            setIsBlocked(!isBlocked);
                          } catch { toast.error('Action failed'); }
                        }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                          🚫 {isBlocked ? 'Unblock user' : 'Block user'}
                        </button>
                        <button onClick={() => setShowReportUser(true)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
                          ⚑ Report user
                        </button>
                      </div>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
                    }}>🔗 Share</Btn>
                  </>
                )}
              </div>
            </div>

            {/* Name + context */}
            <div className="mb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">{name}</h1>
                {profile.workStatus === 'open_to_work' && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">💼 Job seeker · Open to work</span>
                )}
                {profile.workStatus === 'currently_hiring' && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">🏢 Recruiter · Hiring</span>
                )}
                {(!profile.workStatus || profile.workStatus === 'none') && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">🙋 Member</span>
                )}
              </div>
              {profile.headline && <p className="text-slate-600 text-[15px] mt-1 leading-snug">{profile.headline}</p>}
              {ctxLine && (
                <p className="text-sm text-slate-500 mt-1 font-medium">{ctxLine}</p>
              )}
              {profile.location && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {profile.location}
                </p>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-stretch divide-x divide-slate-100 border border-slate-100 rounded-xl overflow-hidden mb-4 bg-slate-50/50">
              <button onClick={() => { if (isOwn) navigate('/connections'); }} className={`flex-1 px-4 py-2.5 text-left transition-colors ${isOwn ? 'cursor-pointer hover:bg-white' : 'cursor-default'}`}>
                <p className="text-lg font-bold leading-tight text-slate-900">{profile.connections?.length ?? 0}</p>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Connections</p>
              </button>
              {isOwn && (
                <button onClick={() => setTab('views')} className={`flex-1 px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-white ${tab==='views'?'bg-white':''}`}>
                  <p className={`text-lg font-bold leading-tight ${tab==='views'?'text-blue-600':'text-slate-900'}`}>{profile.profileViews ?? 0}</p>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Profile views</p>
                </button>
              )}
              <button onClick={() => setTab('posts')} className={`flex-1 px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-white ${tab==='posts'?'bg-white':''}`}>
                <p className={`text-lg font-bold leading-tight ${tab==='posts'?'text-blue-600':'text-slate-900'}`}>{postsTotal ?? '—'}</p>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Posts</p>
              </button>
            </div>

            {/* Profile strength — own only */}
            {isOwn && (
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700">Profile strength</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${str>=80?'bg-emerald-100 text-emerald-700':str>=50?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{str}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${str>=80?'bg-emerald-500':str>=50?'bg-blue-500':'bg-amber-500'}`} style={{width:`${str}%`}}/>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {str<40?'Add your headline, skills and experience to get noticed':str<70?'Great start! Add projects and languages to stand out':str<100?'Almost complete — add resume and contact info':'🌟 All-Star profile! You stand out in search.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Profile / Posts tab bar ─────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex px-2">
            {([
              ['profile', 'Profile', <svg key="p" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>],
              ['posts',   'Posts',   <svg key="o" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>],
            ] as const).map(([id, label, icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors cursor-pointer ${
                  tab === id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {icon}
                {label}
                {id === 'posts' && postsTotal !== null && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{postsTotal}</span>
                )}
                {tab === id && <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-blue-600 rounded-t-full"/>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab panel: Posts / Views ────────────────────────────────────── */}
        {tab !== 'profile' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {tab === 'posts' ? (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-4.5 h-4.5 w-[18px] h-[18px] text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                    {isOwn ? 'My posts' : `${profile.firstName ?? 'User'}'s posts`}
                  </h2>
                  <div className="flex items-center gap-2">
                    {postsTotal !== null && <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">{postsTotal} total</span>}
                    {isOwn && (
                      <button
                        onClick={() => setShowCreatePost(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                        New post
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4">
                  {postsLoading ? (
                    <div className="space-y-3">{[1,2,3].map(i=>(
                      <div key={i} className="border border-slate-100 rounded-xl p-4 animate-pulse flex gap-3">
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0"/>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3.5 bg-slate-100 rounded-full w-2/3"/>
                          <div className="h-3 bg-slate-50 rounded-full"/>
                          <div className="h-3 bg-slate-50 rounded-full w-1/3"/>
                        </div>
                      </div>
                    ))}</div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-14">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </div>
                      <p className="font-bold text-slate-800">No posts yet</p>
                      {isOwn
                        ? <p className="text-sm text-slate-400 mt-1">Share your first post on the <a href="/" className="text-blue-600 hover:underline font-semibold cursor-pointer">home feed</a></p>
                        : <p className="text-sm text-slate-400 mt-1">This user hasn't shared anything publicly.</p>}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {posts.map(p => (
                          <div
                            key={p._id}
                            onClick={() => openPostPopup(p._id)}
                            className="group border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-md hover:bg-blue-50/20 transition-all cursor-pointer"
                            title="View post"
                          >
                            <div className="flex items-start gap-3.5">
                              {p.media?.[0]?.type === 'image' ? (
                                <img src={p.media[0].url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-slate-100"/>
                              ) : p.media?.length ? (
                                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                                  {p.media[0].type === 'video' ? '🎬' : p.media[0].type === 'audio' ? '🎵' : '📄'}
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h8M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-1 group-hover:text-blue-700 transition-colors">{p.title}</p>
                                  {p.visibility === 'private' && <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">🔒 Private</span>}
                                  {p.status === 'suspended' && <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex-shrink-0">⚠️ Suspended</span>}
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>
                                <div className="flex items-center gap-4 mt-2.5">
                                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                    {p.likesCount ?? 0}
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                    {p.commentCount ?? 0}
                                  </span>
                                  <span className="text-xs text-slate-300 flex items-center gap-1 ml-auto">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    {timeAgo(p.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 self-center">
                                {isOwn && (
                                  <>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleEditPost(p._id); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit post"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleDeletePost(p._id); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete post"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                  </>
                                )}
                                <svg className="w-4 h-4 text-slate-200 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {postsPages > 1 && (
                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                          <span className="text-xs text-slate-400">Page {postsPage} of {postsPages}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => loadPosts(postsPage-1)} disabled={postsPage<=1} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-colors cursor-pointer">← Prev</button>
                            {Array.from({length: Math.min(5, postsPages)}, (_, i) => {
                              const p = postsPages <= 5 ? i + 1 : postsPage <= 3 ? i + 1 : postsPage >= postsPages - 2 ? postsPages - 4 + i : postsPage - 2 + i;
                              return (
                                <button
                                  key={p}
                                  onClick={() => loadPosts(p)}
                                  className={`w-8 h-8 text-xs font-bold rounded-xl transition-colors cursor-pointer ${p === postsPage ? 'bg-slate-900 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                                >{p}</button>
                              );
                            })}
                            <button onClick={() => loadPosts(postsPage+1)} disabled={postsPage>=postsPages} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-colors cursor-pointer">Next →</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">👀 Profile views</h2>
                  <span className="text-sm font-bold text-slate-500">{profile.profileViews ?? 0} total</span>
                </div>
                <div className="px-5 py-4">
                  {!viewersLoaded ? (
                    <div className="text-center py-8"><p className="text-sm text-slate-400">Loading viewers…</p></div>
                  ) : viewers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-3xl mb-2">👁️</p>
                      <p className="font-semibold text-slate-700">No profile views yet</p>
                      <p className="text-xs text-slate-400 mt-1">Share your profile to get more visibility</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {viewers.map((v: any) => {
                        const vname = v.firstName ? `${v.firstName} ${v.lastName ?? ''}`.trim() : v.email;
                        return (
                          <div key={v._id} onClick={() => navigate(`/profile/${v._id}`)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                            {v.profilePicture
                              ? <img src={v.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                              : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{vname[0]?.toUpperCase()}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{vname}</p>
                              {v.headline && <p className="text-xs text-slate-400 truncate">{v.headline}</p>}
                            </div>
                            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Profile tab: all detail sections ───────────────────────────── */}
        {tab === 'profile' && (<>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Section title="About" icon="📝" onAdd={() => setEditAbout(true)} isOwn={isOwn} empty={!profile.about}>
          {profile.about && (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap flex-1">{profile.about}</p>
              {isOwn && <button onClick={() => setEditAbout(true)} className="text-slate-300 hover:text-slate-600 flex-shrink-0 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>}
            </div>
          )}
        </Section>

        {/* ── Professional context ──────────────────────────────────────── */}
        {isOwn && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">🏷️ Describes you</h2>
              <button onClick={() => setEditCtx(true)} className="text-slate-300 hover:text-slate-600 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            </div>
            <div className="px-5 py-4">
              {ctxLine ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                    {profile.role === 'student' ? '🎓' : '💼'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{ctxLine}</p>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{profile.role}</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditCtx(true)} className="text-sm text-blue-600 hover:underline cursor-pointer">+ Add professional context</button>
              )}
            </div>
          </div>
        )}

        {/* ── Skills ────────────────────────────────────────────────────── */}
        <Section title="Skills" icon="💡" onAdd={() => setSkillMod('new')} isOwn={isOwn} empty={!profile.skills?.length}>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map(s => (
              <div key={s._id} className="group flex items-center gap-1">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-default ${PROF_COLOR[s.proficiency]??'bg-slate-100 text-slate-600'}`}>{s.name}</span>
                {isOwn && (
                  <div className="hidden group-hover:flex gap-0.5">
                    <button onClick={() => setSkillMod(s)} className="text-slate-300 hover:text-slate-600 text-xs cursor-pointer" title="Edit">✏</button>
                    <button onClick={async () => { await deleteSkill(s._id); refresh(); }} className="text-slate-300 hover:text-red-500 text-xs cursor-pointer" title="Delete">×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* ── Experience ────────────────────────────────────────────────── */}
        <Section title="Experience" icon="💼" onAdd={() => setExpMod('new')} isOwn={isOwn} empty={!profile.experiences?.length}>
          <div className="space-y-4 divide-y divide-slate-100">
            {profile.experiences?.map((e, i) => (
              <div key={e._id} className={`flex gap-3 ${i>0?'pt-4':''}`}>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">🏢</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{e.jobTitle}</p>
                      <p className="text-sm text-slate-600">{e.company} · <span className="capitalize text-slate-500 text-xs">{e.employmentType}</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">{e.startDate} — {e.isCurrent?'Present':e.endDate??''}{e.location?` · ${e.location}`:''}</p>
                    </div>
                    {isOwn && <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setExpMod(e)} className="text-slate-300 hover:text-slate-600 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button onClick={async () => { await deleteExperience(e._id); refresh(); }} className="text-slate-300 hover:text-red-500 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>}
                  </div>
                  {e.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{e.description}</p>}
                  {e.skills?.length ? <div className="flex flex-wrap gap-1 mt-2">{e.skills.map(sk=><span key={sk} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full cursor-default">{sk}</span>)}</div>:null}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Projects ──────────────────────────────────────────────────── */}
        <Section title="Projects" icon="🚀" onAdd={() => setProjMod('new')} isOwn={isOwn} empty={!profile.projects?.length}>
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.projects?.map(p => (
              <div key={p._id} className="border border-slate-200 rounded-2xl overflow-hidden group hover:shadow-md transition-all cursor-default">
                {p.imageUrl ? (
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    {isOwn && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setProjMod(p)} className="w-7 h-7 bg-white/90 hover:bg-white text-slate-700 rounded-lg flex items-center justify-center shadow-sm cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                        <button onClick={async () => { await deleteProject(p._id); refresh(); }} className="w-7 h-7 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg flex items-center justify-center shadow-sm cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center relative group overflow-hidden" style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 40%,#1a4080 100%)'}}>
                    <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 30% 50%,rgba(255,255,255,0.4) 0%,transparent 60%)'}}/>
                    <div className="text-center relative z-10">
                      <span className="text-4xl block mb-1">🚀</span>
                      <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">Project</p>
                    </div>
                    {isOwn && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setProjMod(p)} className="w-7 h-7 bg-white/90 hover:bg-white text-slate-700 rounded-lg flex items-center justify-center shadow-sm cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                        <button onClick={async () => { await deleteProject(p._id); refresh(); }} className="w-7 h-7 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg flex items-center justify-center shadow-sm cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <p className="font-bold text-slate-900 text-base mb-1 leading-tight">{p.title}</p>
                  {p.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{p.description}</p>}
                  <div className="flex gap-3 flex-wrap">
                    {p.liveLink && <a href={p.liveLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer hover:underline">🌐 Live demo</a>}
                    {p.githubLink && <a href={p.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer hover:underline">🐙 GitHub</a>}
                    {p.otherLinks?.map(l=><a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer">🔗 {l.label}</a>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Education ─────────────────────────────────────────────────── */}
        <Section title="Education" icon="🎓" onAdd={() => setEduMod('new')} isOwn={isOwn} empty={!profile.educations?.length}>
          <div className="space-y-4 divide-y divide-slate-100">
            {profile.educations?.map((e,i) => (
              <div key={e._id} className={`flex gap-3 ${i>0?'pt-4':''}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">🎓</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{e.school}</p>
                      <p className="text-sm text-slate-600">{e.degree}{e.fieldOfStudy?`, ${e.fieldOfStudy}`:''}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{e.startDate??''}{(e.endDate||e.isCurrent)?` — ${e.isCurrent?'Present':e.endDate}`:''}</p>
                      {e.grade && <p className="text-xs text-slate-500 mt-0.5">Grade: {e.grade}</p>}
                      {e.activities && <p className="text-xs text-slate-400 mt-0.5 italic">{e.activities}</p>}
                    </div>
                    {isOwn && <div className="flex gap-1">
                      <button onClick={() => setEduMod(e)} className="text-slate-300 hover:text-slate-600 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button onClick={async () => { await deleteEducation(e._id); refresh(); }} className="text-slate-300 hover:text-red-500 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Languages ─────────────────────────────────────────────────── */}
        <Section title="Languages" icon="🌐" onAdd={() => setLangMod('new')} isOwn={isOwn} empty={!profile.languages?.length}>
          <div className="flex flex-wrap gap-2">
            {profile.languages?.map(l => (
              <div key={l._id} className="group flex items-center gap-1">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-default ${PROF_COLOR[l.proficiency]??'bg-slate-100 text-slate-600'}`}>{l.name} · <span className="opacity-70 capitalize">{l.proficiency}</span></span>
                {isOwn && <div className="hidden group-hover:flex gap-0.5">
                  <button onClick={() => setLangMod(l)} className="text-slate-300 hover:text-slate-600 text-xs cursor-pointer">✏</button>
                  <button onClick={async () => { await deleteLanguage(l._id); refresh(); }} className="text-slate-300 hover:text-red-500 text-xs cursor-pointer">×</button>
                </div>}
              </div>
            ))}
          </div>
        </Section>

        {/* ── Contacts ──────────────────────────────────────────────────── */}
        <Section title="Contact info" icon="📬" onAdd={() => setContMod('new')} isOwn={isOwn} empty={!profile.contacts?.length}>
          <div className="space-y-2">
            {profile.contacts?.map(c => (
              <div key={c._id} className="flex items-center gap-3">
                <span className="text-xl cursor-default">{CONTACT_ICON[c.type]??'🔗'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{c.label??c.type}</p>
                  <p className="text-sm text-slate-800 truncate cursor-default">{c.value}</p>
                </div>
                {isOwn && <div className="flex gap-1">
                  <button onClick={() => setContMod(c)} className="text-slate-300 hover:text-slate-600 cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                  <button onClick={async () => { await deleteContact(c._id); refresh(); }} className="text-slate-300 hover:text-red-500 cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>}
              </div>
            ))}
          </div>
        </Section>

        {/* ── Account ───────────────────────────────────────────────────── */}
        {isOwn && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-slate-900 mb-4">⚙️ Account</h2>
            <div className="flex flex-wrap gap-3">
              <Btn variant="ghost" size="md" onClick={logout}>🚪 Logout</Btn>
              <Btn variant="ghost" size="md" onClick={() => setShowDeact(true)}>😴 Deactivate</Btn>
              <Btn variant="danger" size="md" onClick={() => setShowDel(true)}>🗑️ Delete account</Btn>
            </div>
          </div>
        )}

        </>)}
        {/* ── end Profile tab ─────────────────────────────────────────────── */}

        </div>

        {/* ── Right sidebar (own profile): blocked users ──────────────────── */}
        {isOwn && (
          <aside className="space-y-3 lg:sticky lg:top-20 self-start">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">🚫 Blocked users</h3>
                {blocked.length > 0 && <span className="text-xs font-bold text-slate-400">{blocked.length}</span>}
              </div>
              <div className="px-4 py-2">
                {!blockedLoaded ? (
                  <div className="space-y-2 py-2">{[1,2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
                ) : blocked.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">You haven't blocked anyone.</p>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {blocked.map(b => {
                      const bname = b.firstName ? `${b.firstName} ${b.lastName ?? ''}`.trim() : 'User';
                      return (
                        <div key={b._id} className="flex items-center gap-2.5 py-2.5">
                          {b.profilePicture
                            ? <img src={b.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 grayscale"/>
                            : <div className="w-9 h-9 rounded-full bg-slate-300 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{bname[0]?.toUpperCase()}</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate leading-tight">{bname}</p>
                            {b.headline && <p className="text-[11px] text-slate-400 truncate">{b.headline}</p>}
                          </div>
                          <button
                            onClick={() => handleUnblock(b._id)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 rounded-full px-2.5 py-1 transition-all flex-shrink-0 cursor-pointer"
                          >
                            Unblock
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 px-2 leading-relaxed">
              Blocked users can't see your posts or send you messages. Unblock anyone at any time.
            </p>
          </aside>
        )}

        </div>
      </main>

      {/* ══════════ MODALS ══════════ */}

      {editBasic  && <EditBasicModal profile={profile} onClose={() => setEditBasic(false)} onSaved={p => {
              setProfile(p);
              setEditBasic(false);
              if (me && token) {
                setCredentials({ token, user: {
                  ...me,
                  firstName:      p.firstName,
                  lastName:       p.lastName,
                  profilePicture: p.profilePicture,
                  headline:       p.headline,
                  location:       p.location,
                  phone:          p.phone,
                  workStatus:     p.workStatus,
                  jobTitle:       p.jobTitle,
                  company:        p.company,
                  school:         p.school,
                  degree:         p.degree,
                  fieldOfStudy:   p.fieldOfStudy,
                  startYear:      p.startYear,
                }});
              }
            }} />}
      {editAbout  && <Modal title="About" onClose={() => setEditAbout(false)}><AboutForm value={profile.about??''} onSave={async v => { const fd=new FormData(); fd.append('about',v); const r=await updateBasic(fd); setProfile(r.data.data as any); setEditAbout(false); toast.success('Saved!'); }}/></Modal>}
      {editCtx    && <ContextModal profile={profile} onClose={() => setEditCtx(false)} onSaved={p => { setProfile(p); setEditCtx(false); }} />}
      {skillMod   && <SkillModal value={skillMod==='new'?null:skillMod} onClose={() => setSkillMod(null)} onSaved={async d => { skillMod==='new'?await addSkill(d):await editSkill((skillMod as Skill)._id,d); refresh(); setSkillMod(null); toast.success('Skill saved!'); }} />}
      {projMod    && <ProjectModal value={projMod==='new'?null:projMod} onClose={() => setProjMod(null)} onSaved={async fd => { projMod==='new'?await addProject(fd):await editProject((projMod as Project)._id,fd); refresh(); setProjMod(null); toast.success('Project saved!'); }} />}
      {expMod     && <ExpModal value={expMod==='new'?null:expMod} onClose={() => setExpMod(null)} onSaved={async d => { expMod==='new'?await addExperience(d):await editExperience((expMod as Experience)._id,d); refresh(); setExpMod(null); toast.success('Experience saved!'); }} />}
      {eduMod     && <EduModal value={eduMod==='new'?null:eduMod} onClose={() => setEduMod(null)} onSaved={async d => { eduMod==='new'?await addEducation(d):await editEducation((eduMod as Education)._id,d); refresh(); setEduMod(null); toast.success('Education saved!'); }} />}
      {langMod    && <LangModal value={langMod==='new'?null:langMod} onClose={() => setLangMod(null)} onSaved={async d => { langMod==='new'?await addLanguage(d):await editLanguage((langMod as Language)._id,d); refresh(); setLangMod(null); toast.success('Language saved!'); }} />}
      {contMod    && <ContModal value={contMod==='new'?null:contMod} onClose={() => setContMod(null)} onSaved={async d => { contMod==='new'?await addContact(d):await editContact((contMod as Contact)._id,d); refresh(); setContMod(null); toast.success('Contact saved!'); }} />}

      {showDeact && (
        <Modal title="Deactivate account" onClose={() => setShowDeact(false)}>
          <p className="text-sm text-slate-600 mb-4">Your account will be hidden for 7 days, then automatically reactivated. If you don't reactivate within 13 days, it will be permanently deleted.</p>
          <div className="flex gap-3"><Btn variant="ghost" onClick={() => setShowDeact(false)}>Cancel</Btn><Btn variant="danger" onClick={async () => { await deactivateAccount(); toast.success('Account deactivated.'); logout(); }}>Deactivate</Btn></div>
        </Modal>
      )}
      {showDel && (
        <Modal title="Delete account" onClose={() => setShowDel(false)}>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-red-800">⚠️ This cannot be undone.</p>
            <p className="text-xs text-red-700 mt-1">All your posts, connections, messages, and data will be permanently deleted.</p>
          </div>
          <p className="text-sm text-slate-600 mb-4">Are you sure you want to permanently delete your NextHire account?</p>
          <div className="flex gap-3"><Btn variant="ghost" onClick={() => setShowDel(false)}>Cancel</Btn><Btn variant="danger" onClick={async () => { await deleteAccount(); toast.success('Account deleted.'); logout(); }}>Yes, delete permanently</Btn></div>
        </Modal>
      )}

      {/* Full post popup — the complete post experience right on the profile page */}
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
              currentUserId={me?.id ?? ''}
              onLike={async id => {
                setPopupPost(prev => prev ? { ...prev, likedByMe: !prev.likedByMe, likesCount: prev.likedByMe ? prev.likesCount - 1 : prev.likesCount + 1 } : null);
                try { await togglePostLike(id); } catch { /* keep optimistic */ }
              }}
              onDelete={async id => {
                if (!window.confirm('Delete this post permanently?')) return;
                try { await deletePost(id); toast.success('Post deleted'); setPopupPost(null); loadPosts(postsPage); }
                catch { toast.error('Could not delete post'); }
              }}
              onEdit={p => { setPopupPost(null); setEditingPost(p); }}
              onReport={p => setReportingPost(p)}
              onViewReports={p => setViewingReports(p)}
              onExpand={() => {}}
              onConnect={async authorId => {
                try { await sendRequest(authorId); toast.success('Connection request sent!'); }
                catch { toast.error('Could not send request'); }
              }}
            />
          </div>
        </div>
      )}

      {/* Report a post (from the popup) */}
      {reportingPost && (
        <ReportModal post={reportingPost} onClose={() => setReportingPost(null)} />
      )}

      {/* Reports on my post (from the popup) */}
      {viewingReports && (
        <ReportsViewerModal post={viewingReports} onClose={() => setViewingReports(null)} />
      )}

      {/* Create post (own profile Posts tab) */}
      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreated={() => { setShowCreatePost(false); toast.success('Post published!'); loadPosts(1); }}
        />
      )}

      {/* Edit post */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={() => { setEditingPost(null); toast.success('Post updated'); loadPosts(postsPage); }}
        />
      )}

      {/* Resume viewer — renders the PDF inline instead of forcing a download */}
      {showResume && profile.resumeUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowResume(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4.5 h-4.5 w-[18px] h-[18px] text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                {profile.resumeOriginalName ?? 'Resume'}
              </h3>
              <div className="flex items-center gap-2">
                <a href={resumeDownloadUrl(profile.resumeUrl, profile.resumeOriginalName)} className="px-3 py-1.5 text-xs font-bold border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-50 transition-colors">⬇ Download</a>
                <a href={resumeViewUrl(profile.resumeUrl)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">Open in tab ↗</a>
                <button onClick={() => setShowResume(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
              </div>
            </div>
            {/* Google Docs viewer guarantees inline rendering even when Cloudinary
                serves the raw PDF with a download content-type. */}
            <iframe
              title="Resume"
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(resumeViewUrl(profile.resumeUrl))}&embedded=true`}
              className="flex-1 w-full border-0 bg-slate-50"
            />
          </div>
        </div>
      )}

      {/* Report user modal */}
      {showReportUser && (
        <ReportUserModal
          targetName={name}
          onClose={() => setShowReportUser(false)}
          onSubmit={async (reason, description, evidence) => {
            try {
              await reportUser(profileId, { reason, description, evidence });
              toast.success('Report submitted. Our team will review it.');
              setShowReportUser(false);
            } catch (err: any) {
              toast.error(err?.response?.data?.message ?? 'Could not submit report');
            }
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Post detail popup
// ══════════════════════════════════════════════════════════════════════════════

function PostDetailModal({ post, currentUserId, fallbackAuthor, onClose, onAuthorClick, onOpenFull }: {
  post: PostItem;
  currentUserId: string;
  fallbackAuthor: { _id: string; firstName?: string; lastName?: string; profilePicture?: string; headline?: string };
  onClose: () => void;
  onAuthorClick: (userId: string) => void;
  onOpenFull: (postId: string) => void;
}) {
  const author = post.authorId ?? fallbackAuthor;
  const authorName = author.firstName ? `${author.firstName} ${author.lastName ?? ''}`.trim() : 'User';
  const [lightbox, setLightbox] = useState<number | null>(null);
  const media = post.media ?? [];
  const [liked, setLiked] = useState(!!post.likes?.includes(currentUserId));
  const [likesCount, setLikesCount] = useState(post.likesCount ?? post.likes?.length ?? 0);

  const handleLike = async () => {
    setLiked(l => !l);
    setLikesCount(c => liked ? c - 1 : c + 1);
    try { await togglePostLike(post._id); }
    catch { setLiked(l => !l); setLikesCount(c => liked ? c + 1 : c - 1); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-slate-900 text-base truncate pr-3">Post details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg flex-shrink-0 cursor-pointer">×</button>
        </div>

        {/* Author — click to open their profile */}
        <div
          onClick={() => onAuthorClick(author._id)}
          className="flex items-center gap-3 px-5 pt-4 pb-3 cursor-pointer group"
          title={`View ${authorName}'s profile`}
        >
          {author.profilePicture
            ? <img src={author.profilePicture} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"/>
            : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{authorName[0]?.toUpperCase()}</div>
          }
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-tight">{authorName}</p>
            {author.headline && <p className="text-xs text-slate-400 truncate">{author.headline}</p>}
            <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Title + badges + description */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h2 className="font-bold text-slate-900 text-lg leading-snug">{post.title}</h2>
            {post.visibility === 'private' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🔒 Private</span>}
            {post.status === 'suspended' && <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">⚠️ Suspended</span>}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{post.description}</p>
        </div>

        {/* Media */}
        {media.length > 0 && (
          <div className={`px-5 pb-4 grid gap-1.5 ${media.length === 1 ? 'grid-cols-1' : media.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {media.map((m, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: media.length === 1 ? '16/9' : '1' }}>
                {m.type === 'image'
                  ? <img src={m.url} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity" onClick={() => setLightbox(i)}/>
                  : m.type === 'video'
                  ? <video src={m.url} controls className="w-full h-full object-cover"/>
                  : m.type === 'audio'
                  ? <div className="w-full h-full flex items-center justify-center p-3"><audio src={m.url} controls className="w-full"/></div>
                  : <a href={m.url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-1 p-3 hover:bg-slate-200 transition-colors">
                      <span className="text-2xl">📄</span>
                      <span className="text-[11px] font-semibold text-slate-600 text-center line-clamp-2 break-all">{m.originalName ?? 'Document'}</span>
                    </a>
                }
              </div>
            ))}
          </div>
        )}

        {/* Actions footer — like works right here; comments open the full post */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2 text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${liked ? 'text-red-500 bg-red-50' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'}`}
          >
            <svg className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            {likesCount > 0 && <span>{likesCount}</span>} Like
          </button>
          <button
            onClick={() => { onClose(); onOpenFull(post._id); }}
            className="flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
            title="Open the full post to read and write comments"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            {post.commentCount ?? 0} Comments
          </button>
          <span className="ml-auto text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Lightbox */}
        {lightbox !== null && media[lightbox] && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={e => { e.stopPropagation(); setLightbox(null); }}>
            <img src={media[lightbox].url} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()}/>
            <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-lg cursor-pointer">×</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Report user modal
// ══════════════════════════════════════════════════════════════════════════════

const USER_REPORT_REASONS = [
  { value: 'spam',           label: '🚫 Spam or fake account' },
  { value: 'harassment',     label: '😡 Harassment or bullying' },
  { value: 'misinformation', label: '❌ Spreading misinformation' },
  { value: 'inappropriate',  label: '⚠️ Inappropriate behaviour' },
  { value: 'copyright',      label: '©️ Impersonation / copyright' },
  { value: 'other',          label: '📝 Other' },
];

function ReportUserModal({ targetName, onClose, onSubmit }: {
  targetName: string;
  onClose: () => void;
  onSubmit: (reason: string, description?: string, evidence?: File[]) => Promise<void>;
}) {
  const [reason,      setReason]      = useState('');
  const [description, setDescription] = useState('');
  const [evidence,    setEvidence]    = useState<File[]>([]);
  const [previews,    setPreviews]    = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);

  const addEvidence = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    const next = [...evidence, ...imgs].slice(0, 3);
    setEvidence(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const removeEvidence = (i: number) => {
    const next = evidence.filter((_, idx) => idx !== i);
    setEvidence(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!reason) return toast.error('Please select a reason');
    setLoading(true);
    try { await onSubmit(reason, description.trim() || undefined, evidence); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Report ${targetName}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Help us understand the problem. Your report is anonymous — {targetName} won't know you reported them.</p>

        {/* Reason — proper dropdown */}
        <Field label="Reason *">
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={`${inp} cursor-pointer`}
          >
            <option value="" disabled>Select a reason…</option>
            {USER_REPORT_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Additional details (optional)">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Describe what happened…"
            className={`${inp} resize-none`}
          />
        </Field>

        {/* Evidence images (screenshots etc.) */}
        <Field label={`Evidence images (optional, ${evidence.length}/3)`}>
          <div className="flex items-center gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200"/>
                <button
                  onClick={() => removeEvidence(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center hover:bg-red-600 cursor-pointer"
                >×</button>
              </div>
            ))}
            {evidence.length < 3 && (
              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span className="text-[9px] font-bold mt-0.5">Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => addEvidence(e.target.files)}/>
              </label>
            )}
          </div>
        </Field>

        <div className="flex gap-3">
          <Btn variant="ghost" size="lg" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" size="lg" onClick={handleSubmit} disabled={loading || !reason}>{loading ? 'Submitting…' : 'Submit report'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-forms
// ══════════════════════════════════════════════════════════════════════════════

function EditBasicModal({ profile, onClose, onSaved }: { profile: FullUser; onClose: () => void; onSaved: (p: FullUser) => void }) {
  const [form, setForm] = useState({
    firstName: profile.firstName??'', lastName: profile.lastName??'',
    headline: profile.headline??'', location: profile.location??'',
    phone: profile.phone??'', workStatus: profile.workStatus??'none',
  });
  const [loading, setLoading] = useState(false);

  // Avatar crop
  const avatarInputRef   = useRef<HTMLInputElement>(null);
  const [avatarSrc,  setAvatarSrc]  = useState<string|null>(null);
  const [avatarFile, setAvatarFile] = useState<File|null>(null);
  const [cropAvatar, setCropAvatar] = useState(false);

  // Cover crop
  const coverInputRef   = useRef<HTMLInputElement>(null);
  const [coverSrc,  setCoverSrc]  = useState<string|null>(null);
  const [coverFile, setCoverFile] = useState<File|null>(null);
  const [cropCover, setCropCover] = useState(false);

  // Resume
  const resumeRef = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile] = useState<File|null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarSrc(URL.createObjectURL(f)); setCropAvatar(true);
  };
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCoverSrc(URL.createObjectURL(f)); setCropCover(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      if (avatarFile) fd.append('profilePicture', avatarFile);
      if (coverFile)  fd.append('coverPicture', coverFile);
      if (resumeFile) fd.append('resume', resumeFile);
      const res = await updateBasic(fd);
      onSaved(res.data.data as any);
      toast.success('Profile updated!');
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed to save'); }
    finally { setLoading(false); }
  };

  const f = (k: string) => ({ value: (form as any)[k], onChange: (e: any) => setForm(p => ({...p,[k]:e.target.value})) });

  return (
    <>
      {cropAvatar && avatarSrc && (
        <CropModal title="Crop profile picture" src={avatarSrc} aspectRatio={1} onDone={file => { setAvatarFile(file); setCropAvatar(false); }} onCancel={() => setCropAvatar(false)} />
      )}
      {cropCover && coverSrc && (
        <CropModal title="Crop cover image" src={coverSrc} aspectRatio={16/9} onDone={file => { setCoverFile(file); setCropCover(false); }} onCancel={() => setCropCover(false)} />
      )}
      <Modal title="Edit profile" onClose={onClose}>
        <div className="space-y-4">
          {/* Image uploads with previews */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Profile picture</label>
              <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange}/>
              <button onClick={() => avatarInputRef.current?.click()} className="relative w-full h-24 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden hover:border-slate-400 transition-colors cursor-pointer group">
                {(avatarFile && avatarSrc) ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="" className="w-full h-full object-cover"/>
                ) : profile.profilePicture ? (
                  <img src={profile.profilePicture} alt="" className="w-full h-full object-cover opacity-60"/>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-xs">Upload photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">Change</div>
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cover image</label>
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverChange}/>
              <button onClick={() => coverInputRef.current?.click()} className="relative w-full h-24 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden hover:border-slate-400 transition-colors cursor-pointer group">
                {(coverFile && coverSrc) ? (
                  <img src={URL.createObjectURL(coverFile)} alt="" className="w-full h-full object-cover"/>
                ) : profile.coverPicture ? (
                  <img src={profile.coverPicture} alt="" className="w-full h-full object-cover opacity-60"/>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <span className="text-2xl mb-1">🖼️</span>
                    <span className="text-xs">Upload cover</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">Change</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input {...f('firstName')} className={inp} placeholder="John"/></Field>
            <Field label="Last name"><input {...f('lastName')} className={inp} placeholder="Doe"/></Field>
          </div>
          <Field label="Headline"><input {...f('headline')} className={inp} placeholder="e.g. Full Stack Developer at NextHire"/></Field>
          <Field label="Location"><input {...f('location')} className={inp} placeholder="e.g. Malappuram, Kerala"/></Field>
          <Field label="Phone"><input {...f('phone')} className={inp} placeholder="+91 9876543210"/></Field>
          <Field label="Role">
            <select {...f('workStatus')} className={sel}>
              <option value="none" disabled>Member — choose your role</option>
              <option value="open_to_work">💼 Job seeker (open to work)</option>
              <option value="currently_hiring">🏢 Recruiter (currently hiring)</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Your role on NextHire. Job seeker = open to work · Recruiter = hiring. You can switch between the two anytime.</p>
          </Field>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Resume (PDF)</label>
            <input ref={resumeRef} type="file" accept=".pdf" hidden onChange={e => setResumeFile(e.target.files?.[0]??null)}/>
            <button onClick={() => resumeRef.current?.click()} className={`w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-medium cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors ${resumeFile?'text-emerald-600 border-emerald-300 bg-emerald-50':'text-slate-500'}`}>
              {resumeFile ? `✅ ${resumeFile.name}` : profile.resumeUrl ? '📄 Replace resume' : '📄 Upload resume (PDF)'}
            </button>
          </div>
          <Btn variant="primary" size="lg" onClick={handleSave} disabled={loading}>{loading?'Saving…':'Save changes'}</Btn>
        </div>
      </Modal>
    </>
  );
}

function AboutForm({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Tell people about yourself, your background, and what you're passionate about…" className={`${inp} resize-none`}/>
      <p className="text-xs text-slate-400">{text.length}/2000</p>
      <div className="flex gap-2">
        {text && <Btn variant="ghost" onClick={() => onSave('')}>Remove about</Btn>}
        <Btn variant="primary" onClick={() => onSave(text)}>Save</Btn>
      </div>
    </div>
  );
}

function ContextModal({ profile, onClose, onSaved }: { profile: FullUser; onClose: () => void; onSaved: (p: FullUser) => void }) {
  const [role, setRole] = useState(profile.role ?? 'jobseeker');
  const [form, setForm] = useState({ jobTitle: profile.jobTitle??'', company: profile.company??'', school: profile.school??'', degree: profile.degree??'', fieldOfStudy: profile.fieldOfStudy??'', startYear: profile.startYear??'' });
  const f = (k: string) => ({ value: (form as any)[k], onChange: (e: any) => setForm(p => ({...p,[k]:e.target.value})) });

  const handleSave = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    fd.append('role', role);
    const res = await updateBasic(fd);
    onSaved(res.data.data as any);
    toast.success('Updated!');
    onClose();
  };

  return (
    <Modal title="Describes you" onClose={onClose}>
      <div className="space-y-4">
        <Field label="I am a…">
          <div className="grid grid-cols-2 gap-2">
            {(['jobseeker','student'] as const).map((id) => {
              const icon  = id === 'jobseeker' ? '💼' : '🎓';
              const label = id === 'jobseeker' ? 'Working / Job seeker' : 'Student';
              return (
                <button key={id} onClick={() => setRole(id)} className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${role===id?'border-slate-900 bg-slate-900 text-white':'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-lg block mb-0.5">{icon}</span>
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </Field>
        {role === 'jobseeker' ? (
          <>
            <Field label="Job title / Desired role"><input {...f('jobTitle')} className={inp} placeholder="e.g. Frontend Developer"/></Field>
            <Field label="Company"><input {...f('company')} className={inp} placeholder="e.g. Infosys (leave blank if not employed)"/></Field>
          </>
        ) : (
          <>
            <Field label="School / College / University"><input {...f('school')} className={inp} placeholder="e.g. NIT Calicut"/></Field>
            <Field label="Degree">
              <select {...f('degree')} className={sel}><option value="">Select…</option>{['High School','Diploma','B.Tech','B.E.','B.Sc','B.Com','B.A.','M.Tech','M.Sc','MBA','Ph.D','Other'].map(d => <option key={d} value={d}>{d}</option>)}</select>
            </Field>
            <Field label="Field of study"><input {...f('fieldOfStudy')} className={inp} placeholder="e.g. Computer Science"/></Field>
            <Field label="Starting year"><input {...f('startYear')} className={inp} placeholder="e.g. 2022" type="number" min="1990" max="2030"/></Field>
          </>
        )}
        <Btn variant="primary" size="lg" onClick={handleSave}>Save</Btn>
      </div>
    </Modal>
  );
}

function SkillModal({ value, onClose, onSaved }: { value: Skill|null; onClose: () => void; onSaved: (d: any) => void }) {
  const [name, setName] = useState(value?.name??'');
  const [prof, setProf] = useState(value?.proficiency??'intermediate');
  return (
    <Modal title={value?'Edit skill':'Add skill'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Skill name *"><input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="e.g. React, Python, Figma" autoFocus/></Field>
        <Field label="Proficiency">
          <div className="grid grid-cols-2 gap-2">
            {['beginner','intermediate','advanced','expert'].map(p => (
              <button key={p} onClick={() => setProf(p)} className={`py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all cursor-pointer ${prof===p?'border-slate-900 bg-slate-900 text-white':'border-slate-200 hover:border-slate-300 text-slate-600'}`}>{p}</button>
            ))}
          </div>
        </Field>
        <Btn variant="primary" size="lg" onClick={() => { if(name.trim()) onSaved({name:name.trim(),proficiency:prof}); else toast.error('Enter a skill name'); }}>Save skill</Btn>
      </div>
    </Modal>
  );
}

function ProjectModal({ value, onClose, onSaved }: { value: Project|null; onClose: () => void; onSaved: (fd: FormData) => void }) {
  const [form, setForm] = useState({ title: value?.title??'', description: value?.description??'', liveLink: value?.liveLink??'', githubLink: value?.githubLink??'' });
  const [img, setImg] = useState<File|null>(null);
  const f = (k: string) => ({ value: (form as any)[k], onChange: (e: any) => setForm(p => ({...p,[k]:e.target.value})) });
  const handleSave = () => {
    if (!form.title.trim()) return toast.error('Project title is required');
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k,v));
    if (img) fd.append('image', img);
    onSaved(fd);
  };
  return (
    <Modal title={value?'Edit project':'Add project'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Project title *"><input {...f('title')} className={inp} placeholder="NextHire Job Portal" autoFocus/></Field>
        <Field label="About this project"><textarea {...f('description')} rows={3} className={`${inp} resize-none`} placeholder="What does this project do? What technologies did you use?"/></Field>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Project image</label>
          <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
            {img ? (
              <img src={URL.createObjectURL(img)} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>
            ) : value?.imageUrl ? (
              <img src={value.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 opacity-60"/>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">🖼️</div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-700">{img?img.name:value?.imageUrl?'Replace image':'Upload project screenshot'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
            </div>
            <input type="file" accept="image/*" hidden onChange={e => setImg(e.target.files?.[0]??null)}/>
          </label>
        </div>
        <Field label="Live link"><input {...f('liveLink')} className={inp} placeholder="https://nexthire.app"/></Field>
        <Field label="GitHub link"><input {...f('githubLink')} className={inp} placeholder="https://github.com/username/repo"/></Field>
        <Btn variant="primary" size="lg" onClick={handleSave}>Save project</Btn>
      </div>
    </Modal>
  );
}

function ExpModal({ value, onClose, onSaved }: { value: Experience|null; onClose: () => void; onSaved: (d: any) => void }) {
  const [f, setF] = useState({ jobTitle:value?.jobTitle??'', company:value?.company??'', employmentType:value?.employmentType??'full-time', startDate:value?.startDate??'', endDate:value?.endDate??'', isCurrent:value?.isCurrent??false, location:value?.location??'', description:value?.description??'' });
  const fi = (k: string) => ({ value:(f as any)[k], onChange:(e:any) => setF(p=>({...p,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value})) });
  return (
    <Modal title={value?'Edit experience':'Add experience'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Job title *"><input {...fi('jobTitle')} className={inp} placeholder="Software Developer" autoFocus/></Field>
        <Field label="Company *"><input {...fi('company')} className={inp} placeholder="NextHire Inc."/></Field>
        <Field label="Employment type">
          <select {...fi('employmentType')} className={sel}>{['full-time','part-time','contract','freelance','internship','volunteer'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><input type="month" {...fi('startDate')} className={inp}/></Field>
          <Field label="End date"><input type="month" {...fi('endDate')} className={inp} disabled={f.isCurrent}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" {...fi('isCurrent')} checked={f.isCurrent} className="rounded cursor-pointer"/> Currently working here</label>
        <Field label="Location"><input {...fi('location')} className={inp} placeholder="Kochi, Kerala"/></Field>
        <Field label="Description"><textarea {...fi('description')} rows={3} className={`${inp} resize-none`} placeholder="Describe your responsibilities and achievements…"/></Field>
        <Btn variant="primary" size="lg" onClick={() => { if(!f.jobTitle||!f.company) return toast.error('Title and company required'); onSaved(f); }}>Save experience</Btn>
      </div>
    </Modal>
  );
}

function EduModal({ value, onClose, onSaved }: { value: Education|null; onClose: () => void; onSaved: (d: any) => void }) {
  const [f, setF] = useState({ school:value?.school??'', degree:value?.degree??'', fieldOfStudy:value?.fieldOfStudy??'', startDate:value?.startDate??'', endDate:value?.endDate??'', isCurrent:value?.isCurrent??false, grade:value?.grade??'', activities:value?.activities??'', description:value?.description??'' });
  const fi = (k: string) => ({ value:(f as any)[k], onChange:(e:any) => setF(p=>({...p,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value})) });
  return (
    <Modal title={value?'Edit education':'Add education'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="School / College / University *"><input {...fi('school')} className={inp} placeholder="NIT Calicut" autoFocus/></Field>
        <Field label="Degree *">
          <select {...fi('degree')} className={sel}><option value="">Select degree</option>{['High School','Diploma','B.Tech','B.E.','B.Sc','B.Com','B.A.','M.Tech','M.Sc','MBA','Ph.D','Other'].map(d=><option key={d} value={d}>{d}</option>)}</select>
        </Field>
        <Field label="Field of study"><input {...fi('fieldOfStudy')} className={inp} placeholder="Computer Science"/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><input type="month" {...fi('startDate')} className={inp}/></Field>
          <Field label="End date"><input type="month" {...fi('endDate')} className={inp} disabled={f.isCurrent}/></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" {...fi('isCurrent')} checked={f.isCurrent} className="rounded cursor-pointer"/> Currently studying here</label>
        <Field label="Grade / CGPA"><input {...fi('grade')} className={inp} placeholder="9.0 / 10.0 or 85%"/></Field>
        <Field label="Activities / Achievements"><textarea {...fi('activities')} rows={2} className={`${inp} resize-none`} placeholder="Tech fest organiser, Gold medal in athletics…"/></Field>
        <Btn variant="primary" size="lg" onClick={() => { if(!f.school||!f.degree) return toast.error('School and degree required'); onSaved(f); }}>Save education</Btn>
      </div>
    </Modal>
  );
}

function LangModal({ value, onClose, onSaved }: { value: Language|null; onClose: () => void; onSaved: (d: any) => void }) {
  const [name, setName] = useState(value?.name??'');
  const [prof, setProf] = useState(value?.proficiency??'conversational');
  return (
    <Modal title={value?'Edit language':'Add language'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Language *"><input value={name} onChange={e=>setName(e.target.value)} className={inp} placeholder="e.g. Malayalam, English, Hindi" autoFocus/></Field>
        <Field label="Proficiency">
          <div className="grid grid-cols-2 gap-2">
            {['basic','conversational','professional','native'].map(p=>(
              <button key={p} onClick={()=>setProf(p)} className={`py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all cursor-pointer ${prof===p?'border-slate-900 bg-slate-900 text-white':'border-slate-200 hover:border-slate-300 text-slate-600'}`}>{p}</button>
            ))}
          </div>
        </Field>
        <Btn variant="primary" size="lg" onClick={()=>{ if(name.trim()) onSaved({name:name.trim(),proficiency:prof}); else toast.error('Enter a language name'); }}>Save</Btn>
      </div>
    </Modal>
  );
}

function ContModal({ value, onClose, onSaved }: { value: Contact|null; onClose: () => void; onSaved: (d: any) => void }) {
  const [type,  setType]  = useState(value?.type??'linkedin');
  const [val,   setVal]   = useState(value?.value??'');
  const [label, setLabel] = useState(value?.label??'');
  const isPhone = type === 'whatsapp';
  const PLACEHOLDER: Record<string,string> = { whatsapp:'+91 9876543210', linkedin:'https://linkedin.com/in/username', github:'https://github.com/username', portfolio:'https://yourwebsite.com', twitter:'https://twitter.com/username', instagram:'https://instagram.com/username', other:'https://...' };
  return (
    <Modal title={value?'Edit contact':'Add contact info'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Contact type">
          <div className="grid grid-cols-3 gap-2">
            {(['whatsapp','linkedin','github','portfolio','twitter','instagram','other'] as const).map(t=>(
              <button key={t} onClick={()=>setType(t)} className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${type===t?'border-slate-900 bg-slate-900 text-white':'border-slate-200 hover:border-slate-300'}`}>
                <span className="text-lg block">{CONTACT_ICON[t]}</span>
                <span className="text-[10px] font-semibold capitalize">{t}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label={isPhone?'Phone number (with country code)':'URL'}>
          <input value={val} onChange={e=>setVal(e.target.value)} className={inp} placeholder={PLACEHOLDER[type]??'https://...'}/>
        </Field>
        {type==='other' && <Field label="Label"><input value={label} onChange={e=>setLabel(e.target.value)} className={inp} placeholder="e.g. Behance, Dribbble, YouTube"/></Field>}
        <Btn variant="primary" size="lg" onClick={()=>{ if(val.trim()) onSaved({type,value:val.trim(),label:label||undefined}); else toast.error('Enter a value'); }}>Save contact</Btn>
      </div>
    </Modal>
  );
}
