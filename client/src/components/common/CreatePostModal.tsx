import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { createPost, Post } from '../../services/postService';

interface Props {
  onClose(): void;
  onCreated(post: Post): void;
}

const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','🔥','🎉','💯','✅','🚀','💡','💼','🎓','📄','💬','🌟','🤝','📢','🙌'];

const MAX_FILES = 10;

export default function CreatePostModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [visibility,  setVisibility]  = useState<'public' | 'private'>('public');
  const [files,       setFiles]       = useState<File[]>([]);
  const [previews,    setPreviews]    = useState<{ url: string; type: string; name: string }[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [focusedField, setFocused]   = useState<'title' | 'desc'>('desc');
  const fileRef    = useRef<HTMLInputElement>(null);
  const descRef    = useRef<HTMLTextAreaElement>(null);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    const combined = [...files, ...arr].slice(0, MAX_FILES);
    setFiles(combined);
    setPreviews(combined.map(f => ({
      url:  f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
      type: f.type,
      name: f.name,
    })));
  };

  const removeFile = (idx: number) => {
    setFiles(f  => f.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const insertEmoji = (emoji: string) => {
    if (focusedField === 'title') {
      setTitle(t => t + emoji);
    } else {
      setDescription(d => d + emoji);
      descRef.current?.focus();
    }
    setShowEmoji(false);
  };

  const handleSubmit = async () => {
    if (!title.trim())       return toast.error('Please add a title');
    if (!description.trim()) return toast.error('Please add a description');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title',       title.trim());
      fd.append('description', description.trim());
      fd.append('visibility',  visibility);
      files.forEach(f => fd.append('media', f));
      const res = await createPost(fd);
      toast.success('Post created!');
      onCreated(res.data.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/'))  return '🎬';
    if (type.startsWith('audio/'))  return '🎵';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word'))      return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    return '📎';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            {user?.profilePicture
              ? <img src={user.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
              : <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                  {(user?.firstName?.[0] ?? '?').toUpperCase()}
                </div>
            }
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'You'}
              </p>
              <div className="relative mt-0.5">
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value as 'public' | 'private')}
                  className="appearance-none text-[10px] font-semibold pl-2 pr-6 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="public">🌍 Public</option>
                  <option value="private">🔒 Only me</option>
                </select>
                <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setFocused('title')}
            placeholder="Post title…"
            maxLength={200}
            className="w-full text-base font-semibold placeholder-slate-300 border-b border-slate-200 pb-2 focus:outline-none focus:border-slate-400 transition-colors"
          />

          {/* Description */}
          <textarea
            ref={descRef}
            value={description}
            onChange={e => setDescription(e.target.value)}
            onFocus={() => setFocused('desc')}
            placeholder="What's on your mind? Share something with the community…"
            rows={4}
            maxLength={5000}
            className="w-full text-sm text-slate-700 placeholder-slate-300 resize-none focus:outline-none leading-relaxed"
          />

          {/* File previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-slate-100 aspect-square group">
                  {p.url
                    ? <img src={p.url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                        <span className="text-2xl">{getFileIcon(p.type)}</span>
                        <span className="text-[10px] text-slate-500 text-center break-all line-clamp-2">{p.name}</span>
                      </div>
                  }
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                </div>
              ))}
              {previews.length < MAX_FILES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-300 hover:border-slate-400 hover:text-slate-500 transition-colors text-xs"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Add
                </button>
              )}
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="text-lg w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-lg transition-colors"
                  >{e}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar + Submit */}
        <div className="px-5 pb-5 flex items-center gap-2 border-t border-slate-100 pt-3">
          {/* File */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Add media / files"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Media
          </button>

          {/* Emoji */}
          <button
            onClick={() => setShowEmoji(v => !v)}
            title="Add emoji"
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${showEmoji ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
          >
            <span className="text-base">😊</span> Emoji
          </button>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            hidden
            onChange={e => addFiles(e.target.files)}
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !description.trim()}
            className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
