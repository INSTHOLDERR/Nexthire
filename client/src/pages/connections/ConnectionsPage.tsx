import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { getConnections, getSuggestions, sendRequest, acceptRequest, rejectRequest, removeConnection, UserStub } from '../../services/socialService';
import toast from 'react-hot-toast';

function UserCard({ user, action, actionLabel, actionVariant, onAction }: {
  user: UserStub;
  action?: () => void;
  actionLabel?: string;
  actionVariant?: 'primary' | 'ghost' | 'danger';
  onAction?: () => void;
}) {
  const navigate = useNavigate();
  const name = user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'User';
  const variantCls = actionVariant === 'danger' ? 'border border-red-200 text-red-600 hover:bg-red-50'
    : actionVariant === 'ghost' ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  const goProfile = () => navigate(`/profile/${user._id}`);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all">
      <div onClick={goProfile} className="flex-shrink-0 cursor-pointer" title={`View ${name}'s profile`}>
        {user.profilePicture
          ? <img src={user.profilePicture} alt="" className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-blue-200 transition-all"/>
          : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold text-base hover:ring-2 hover:ring-blue-200 transition-all">{name[0]?.toUpperCase()}</div>
        }
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={goProfile}>
        <p className="font-semibold text-slate-900 text-sm truncate hover:text-blue-600 transition-colors">{name}</p>
        {user.headline && <p className="text-xs text-slate-400 truncate">{user.headline}</p>}
        {user.role && !user.headline && <p className="text-xs text-slate-400 capitalize">{user.role}</p>}
      </div>
      {action && actionLabel && (
        <button onClick={action} className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${variantCls}`}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initTab = (searchParams.get('tab') ?? 'connections') as 'connections'|'requests'|'suggestions';
  const [tab, setTab] = useState<'connections'|'requests'|'suggestions'>(initTab);
  const [connections, setConnections] = useState<UserStub[]>([]);
  const [requests, setRequests]       = useState<UserStub[]>([]);
  const [pending, setPending]         = useState<UserStub[]>([]);
  const [suggestions, setSuggestions] = useState<UserStub[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [connRes, suggRes] = await Promise.all([getConnections(), getSuggestions()]);
      const d = connRes.data.data;
      setConnections(d.connections ?? []);
      setRequests(d.requests ?? []);
      setPending(d.pending ?? []);
      setSuggestions(suggRes.data.data ?? []);
    } catch { toast.error('Could not load connections'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAccept = async (u: UserStub) => {
    await acceptRequest(u._id);
    setRequests(prev => prev.filter(r => r._id !== u._id));
    setConnections(prev => [u, ...prev]);
    toast.success(`Connected with ${u.firstName}!`);
  };

  const handleReject = async (id: string) => {
    await rejectRequest(id);
    setRequests(prev => prev.filter(r => r._id !== id));
    toast.success('Request rejected');
  };

  const handleConnect = async (u: UserStub) => {
    await sendRequest(u._id);
    setSuggestions(prev => prev.filter(s => s._id !== u._id));
    setPending(prev => [u, ...prev]);
    toast.success('Connection request sent!');
  };

  const handleRemove = async (id: string) => {
    await removeConnection(id);
    setConnections(prev => prev.filter(c => c._id !== id));
    toast.success('Connection removed');
  };

  const TABS = [
    { id: 'connections',  label: 'My Connections', count: connections.length },
    { id: 'requests',     label: 'Requests',        count: requests.length },
    { id: 'suggestions',  label: 'People you may know', count: suggestions.length },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-5">Connections</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 mb-5 shadow-sm">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Pending sent requests bar */}
        {tab === 'connections' && pending.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Pending requests sent ({pending.length})</p>
            <div className="flex flex-wrap gap-2">
              {pending.map(u => (
                <span key={u._id} className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
                  {u.firstName ?? 'User'} — waiting
                </span>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse flex gap-3"><div className="w-11 h-11 rounded-full bg-slate-200"/><div className="flex-1 space-y-2"><div className="h-3.5 bg-slate-200 rounded-full w-1/2"/><div className="h-3 bg-slate-100 rounded-full w-1/3"/></div></div>)}
          </div>
        ) : tab === 'connections' ? (
          connections.length === 0
            ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center"><p className="text-4xl mb-3">🤝</p><p className="font-bold text-slate-800">No connections yet</p><p className="text-sm text-slate-400 mt-1">Go to "People you may know" to start connecting</p></div>
            : <div className="grid gap-3">{connections.map(u => <UserCard key={u._id} user={u} action={() => handleRemove(u._id)} actionLabel="Remove" actionVariant="ghost"/>)}</div>
        ) : tab === 'requests' ? (
          requests.length === 0
            ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center"><p className="text-4xl mb-3">📬</p><p className="font-bold text-slate-800">No pending requests</p></div>
            : <div className="grid gap-3">{requests.map(u => (
                <div key={u._id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300 transition-all">
                  <div onClick={() => navigate(`/profile/${u._id}`)} className="flex-shrink-0 cursor-pointer" title="View profile">
                    {u.profilePicture
                      ? <img src={u.profilePicture} alt="" className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-blue-200 transition-all"/>
                      : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold hover:ring-2 hover:ring-blue-200 transition-all">{(u.firstName?.[0] ?? '?').toUpperCase()}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${u._id}`)}>
                    <p className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors">{u.firstName} {u.lastName}</p>
                    {u.headline && <p className="text-xs text-slate-400 truncate">{u.headline}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(u)} className="text-xs font-bold px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Accept</button>
                    <button onClick={() => handleReject(u._id)} className="text-xs font-bold px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50">Decline</button>
                  </div>
                </div>
              ))}</div>
        ) : (
          suggestions.length === 0
            ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center"><p className="text-4xl mb-3">👥</p><p className="font-bold text-slate-800">No suggestions right now</p><p className="text-sm text-slate-400 mt-1">As more people join, we'll suggest connections.</p></div>
            : <div className="grid gap-3">{suggestions.map(u => <UserCard key={u._id} user={u} action={() => handleConnect(u)} actionLabel="+ Connect" actionVariant="primary"/>)}</div>
        )}
      </main>
    </div>
  );
}
