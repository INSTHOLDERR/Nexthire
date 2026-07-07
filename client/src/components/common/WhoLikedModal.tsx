import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPostLikes, PostLiker } from '../../services/postService';

/** Modal listing everyone who liked a post. Clicking a person opens their profile. */
export default function WhoLikedModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState<PostLiker[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getPostLikes(postId, p);
      setUsers(res.data.data.users ?? []);
      setTotal(res.data.data.total ?? 0);
      setPages(res.data.data.pages ?? 1);
      setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [postId]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px] text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            Liked by {total > 0 ? `· ${total}` : ''}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-3 py-2">
          {loading ? (
            <div className="space-y-2 p-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse"/>)}</div>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">No likes yet — be the first!</p>
          ) : (
            users.map(u => {
              const name = u.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'User';
              return (
                <div
                  key={u._id}
                  onClick={() => { onClose(); navigate(`/profile/${u._id}`); }}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  title={`View ${name}'s profile`}
                >
                  {u.profilePicture
                    ? <img src={u.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                    : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{name[0]?.toUpperCase()}</div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight hover:text-blue-600 transition-colors">{name}</p>
                    {u.headline && <p className="text-xs text-slate-400 truncate">{u.headline}</p>}
                  </div>
                  <svg className="w-4 h-4 text-slate-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </div>
              );
            })
          )}
        </div>

        {pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => load(page - 1)} disabled={page <= 1} className="text-xs font-semibold text-slate-500 disabled:opacity-30 hover:text-slate-800 cursor-pointer">← Prev</button>
            <span className="text-xs text-slate-400">{page} / {pages}</span>
            <button onClick={() => load(page + 1)} disabled={page >= pages} className="text-xs font-semibold text-slate-500 disabled:opacity-30 hover:text-slate-800 cursor-pointer">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
