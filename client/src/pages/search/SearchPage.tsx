import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { search, sendRequest, UserStub } from '../../services/socialService';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const navigate = useNavigate();
  const [users, setUsers]     = useState<UserStub[]>([]);
  const [posts, setPosts]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState<'all'|'people'|'posts'>('all');

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    search(q)
      .then(res => { setUsers(res.data.data.users ?? []); setPosts(res.data.data.posts ?? []); })
      .catch(() => toast.error('Search failed'))
      .finally(() => setLoading(false));
  }, [q]);

  const handleConnect = async (id: string) => {
    try { await sendRequest(id); toast.success('Request sent!'); }
    catch { toast.error('Could not send request'); }
  };

  const showUsers = tab !== 'posts';
  const showPosts = tab !== 'people';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Results for <span className="text-blue-600">"{q}"</span>
        </h1>
        <p className="text-sm text-slate-400 mb-5">{users.length + posts.length} results</p>

        <div className="flex gap-1 mb-5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {(['all','people','posts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${tab===t?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-50'}`}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse flex gap-3"><div className="w-11 h-11 rounded-full bg-slate-200"/><div className="flex-1 space-y-2"><div className="h-3.5 bg-slate-200 rounded-full w-1/2"/><div className="h-3 bg-slate-100 rounded-full w-1/3"/></div></div>)}</div>
        ) : (
          <div className="space-y-3">
            {showUsers && users.map(u => {
              const name = u.firstName ? `${u.firstName} ${u.lastName??''}`.trim() : 'User';
              return (
                <div key={u._id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all">
                  <div onClick={() => navigate(`/profile/${u._id}`)} className="flex-shrink-0 cursor-pointer" title={`View ${name}'s profile`}>
                    {u.profilePicture
                      ? <img src={u.profilePicture} alt="" className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-blue-200 transition-all"/>
                      : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold hover:ring-2 hover:ring-blue-200 transition-all">{name[0].toUpperCase()}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${u._id}`)}>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-900 text-sm truncate hover:text-blue-600 transition-colors">{name}</p>
                      {u.role === 'jobseeker' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">💼 Job seeker</span>}
                      {u.role === 'recruiter' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">🏢 Recruiter</span>}
                    </div>
                    {u.headline && <p className="text-xs text-slate-400 truncate">{u.headline}</p>}
                  </div>
                  <button onClick={() => handleConnect(u._id)} className="text-xs font-bold px-3 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl">+ Connect</button>
                </div>
              );
            })}

            {showPosts && posts.map(p => {
              const author = p.authorId ?? p.author;
              const authorName = author?.firstName ? `${author.firstName} ${author.lastName??''}`.trim() : 'User';
              return (
                <div key={p._id??p.id} onClick={() => navigate('/')} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 mb-2 w-fit cursor-pointer" onClick={e => { e.stopPropagation(); if (author?._id ?? author?.id) navigate(`/profile/${author._id ?? author.id}`); }} title={`View ${authorName}'s profile`}>
                    {author?.profilePicture
                      ? <img src={author.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover"/>
                      : <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">{authorName[0]?.toUpperCase()??'?'}</div>
                    }
                    <span className="text-xs text-slate-500 font-medium hover:text-blue-600 transition-colors">{authorName}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>
                </div>
              );
            })}

            {!loading && users.length===0 && posts.length===0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-bold text-slate-800">No results found</p>
                <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
