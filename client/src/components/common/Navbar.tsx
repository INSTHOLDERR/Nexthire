import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import NHLogo from './NHLogo';

interface NavItem { id: string; label: string; icon: React.ReactNode; path: string }

const navItems: NavItem[] = [
  {
    id: 'home', label: 'Home', path: '/',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  },
  {
    id: 'jobs', label: 'Jobs', path: '/jobs',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  },
  {
    id: 'messages', label: 'Messages', path: '/messages',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
  },
  {
    id: 'connections', label: 'Connections', path: '/connections',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  },
  {
    id: 'notifications', label: 'Notifications', path: '/notifications',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  },
  {
    id: 'ai', label: 'AI Chatbot', path: '/ai',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v3"/></svg>,
  },
];

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const [dropOpen,       setDropOpen]       = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [showSearch,     setShowSearch]     = useState(false);
  const [searchResults,  setSearchResults]  = useState<{users:any[];posts:any[]}>({users:[],posts:[]});
  const [searching,      setSearching]      = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [unreadNotifs,   setUnreadNotifs]   = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useSocket({
    notification: () => setUnreadNotifs(n => n + 1),
    new_message:  () => setUnreadMessages(n => n + 1),
  });
  const dropRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
      setSearchQuery('');
    }
  };

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) { setSearchResults({users:[],posts:[]}); setShowDropdown(false); return; }
    setShowDropdown(true);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/social/search?q=${encodeURIComponent(val)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('nh_token')}` }
        });
        const data = await res.json();
        setSearchResults(data.data ?? {users:[],posts:[]});
      } catch { setSearchResults({users:[],posts:[]}); }
      finally { setSearching(false); }
    }, 250);
  };

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const avatar = user?.profilePicture
    ? <img src={user.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
    : <div className="w-9 h-9 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
        {(user?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
      </div>;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex-shrink-0">
          <NHLogo size={28} showWordmark wordmarkClass="text-base font-bold text-slate-900" />
        </button>

        {/* Live Search */}
        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-sm relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setTimeout(() => setShowDropdown(false), 150); }}>
          <div className="relative w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery && setShowDropdown(true)}
              placeholder="Search people, posts…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 focus:bg-white border border-transparent focus:border-slate-300 rounded-xl focus:outline-none transition-all"
            />
            {searching && <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
          </div>

          {/* Live dropdown */}
          {showDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
              {/* People */}
              {searchResults.users.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">People</p>
                  {searchResults.users.slice(0,4).map((u: any) => (
                    <button key={u._id} tabIndex={0} onClick={() => { navigate(`/profile/${u._id}`); setShowDropdown(false); setSearchQuery(''); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors">
                      {u.profilePicture
                        ? <img src={u.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                        : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">{(u.firstName?.[0]??'?').toUpperCase()}</div>
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.firstName} {u.lastName}</p>
                        {u.headline && <p className="text-xs text-slate-400 truncate">{u.headline}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* Posts */}
              {searchResults.posts.length > 0 && (
                <div className={searchResults.users.length > 0 ? 'border-t border-slate-100' : ''}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posts</p>
                  {searchResults.posts.slice(0,3).map((p: any) => (
                    <button key={p._id} tabIndex={0} onClick={() => { navigate(`/?search=${encodeURIComponent(searchQuery)}`); setShowDropdown(false); }} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors">
                      <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      <p className="text-sm text-slate-700 truncate">{p.title}</p>
                    </button>
                  ))}
                </div>
              )}
              {/* No results */}
              {!searching && searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-slate-400">No results for "<span className="font-semibold text-slate-600">{searchQuery}</span>"</p>
                </div>
              )}
              {/* Show all */}
              <div className="border-t border-slate-100 px-4 py-2.5">
                <button onClick={handleSearch} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Search all results for "{searchQuery}" →
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Nav items */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); if (item.id==='notifications') setUnreadNotifs(0); if (item.id==='messages') setUnreadMessages(0); }}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="relative">
                  {item.icon}
                  {item.id==='notifications' && unreadNotifs>0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadNotifs>9?'9+':unreadNotifs}</span>
                  )}
                  {item.id==='messages' && unreadMessages>0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadMessages>9?'9+':unreadMessages}</span>
                  )}
                </span>
                <span className="hidden md:block">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile picture + dropdown */}
        <div ref={dropRef} className="relative flex-shrink-0">
          <button
            onClick={() => setDropOpen(p => !p)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {avatar}
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setDropOpen(false); navigate(`/profile/${user?.id}`); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  View profile
                </button>
                <button
                  onClick={() => { setDropOpen(false); navigate('/reports'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  My reports
                </button>
                <button
                  onClick={() => { setDropOpen(false); navigate('/ai-interview'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v3"/></svg>
                  AI Mock Interview
                </button>
              </div>

              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={() => { setDropOpen(false); logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden flex border-t border-slate-100 bg-white">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
