import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { getSocket, useSocket } from '../../hooks/useSocket';
import {
  getConversations, startConversation, acceptConversation, ignoreConversation,
  getMessages, sendMessage, sendMediaMessage,
  createGroup, respondGroupInvite, addGroupMembers, removeGroupMember, setGroupAdmin, renameGroup, leaveGroup,
  search as searchUsers, getConnections,
  Conversation, Message, UserStub,
} from '../../services/socialService';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const nameOf = (u?: UserStub | null) =>
  u?.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'User';

const senderOf = (m: Message): UserStub | null =>
  typeof m.senderId === 'object' && m.senderId !== null ? m.senderId as UserStub : null;

const senderIdOf = (m: Message): string =>
  typeof m.senderId === 'string' ? m.senderId : (m.senderId as UserStub)?._id ?? '';

const timeHM = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

const dayLabel = (d: string) => {
  const date = new Date(d); const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

const listTime = (d?: string) => {
  if (!d) return '';
  const date = new Date(d); const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay ? timeHM(d) : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const fmtBytes = (n?: number) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

function ConvAvatar({ conv, other, size = 'w-12 h-12' }: { conv: Conversation; other?: UserStub | null; size?: string }) {
  if (conv.isGroup) {
    return conv.avatar
      ? <img src={conv.avatar} alt="" className={`${size} rounded-full object-cover flex-shrink-0`}/>
      : <div className={`${size} rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold flex-shrink-0`}>
          <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        </div>;
  }
  return other?.profilePicture
    ? <img src={other.profilePicture} alt="" className={`${size} rounded-full object-cover flex-shrink-0`}/>
    : <div className={`${size} rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-white flex items-center justify-center font-bold flex-shrink-0`}>{(nameOf(other)[0] ?? '?').toUpperCase()}</div>;
}

/* ─── Message bubble (WhatsApp style) ──────────────────────────────────────── */

function MessageBubble({ m, mine, isGroup, onImageClick, onAuthorClick }: {
  m: Message; mine: boolean; isGroup: boolean;
  onImageClick: (url: string) => void;
  onAuthorClick: (id: string) => void;
}) {
  const sender = senderOf(m);

  if (m.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">{m.text}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${
        mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
      }`}>
        {/* Sender name in groups (their messages only) */}
        {isGroup && !mine && sender && (
          <button onClick={() => onAuthorClick(sender._id)} className="block text-[11px] font-bold text-blue-600 mb-0.5 hover:underline cursor-pointer">
            {nameOf(sender)}
          </button>
        )}

        {/* Media */}
        {m.type === 'image' && m.media?.url && (
          <img src={m.media.url} alt="" onClick={() => onImageClick(m.media!.url)} className="rounded-xl max-h-64 w-full object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"/>
        )}
        {m.type === 'video' && m.media?.url && (
          <video src={m.media.url} controls className="rounded-xl max-h-64 w-full mb-1"/>
        )}
        {m.type === 'audio' && m.media?.url && (
          <div className="flex items-center gap-2 py-1 min-w-[200px]">
            <span className={mine ? 'text-blue-200' : 'text-slate-400'}>🎤</span>
            <audio src={m.media.url} controls className="h-9 w-full max-w-[220px]" preload="metadata"/>
          </div>
        )}
        {m.type === 'file' && m.media?.url && (
          <a
            href={m.media.url} target="_blank" rel="noopener noreferrer" download={m.media.originalName}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-1 transition-colors ${mine ? 'bg-blue-700/60 hover:bg-blue-700' : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${mine ? 'bg-blue-500' : 'bg-white border border-slate-200'}`}>📄</div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate ${mine ? 'text-white' : 'text-slate-800'}`}>{m.media.originalName ?? 'File'}</p>
              <p className={`text-[10px] ${mine ? 'text-blue-200' : 'text-slate-400'}`}>{fmtBytes(m.media.sizeBytes)} · tap to download</p>
            </div>
          </a>
        )}

        {/* Text / caption */}
        {m.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>}

        <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-blue-200' : 'text-slate-400'}`}>
          {timeHM(m.createdAt)}{mine && (m.read ? ' ✓✓' : ' ✓')}
        </p>
      </div>
    </div>
  );
}

/* ─── 1-to-1 Call overlay (WebRTC) ─────────────────────────────────────────────
   Media flows peer-to-peer; the server only relays SDP/ICE over Socket.io.
   Group calls need an SFU (LiveKit/mediasoup) and are intentionally not here. */

const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

interface CallState {
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  callType: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  offer?: RTCSessionDescriptionInit; // present for incoming
}

function CallOverlay({ call, myId, onClose }: { call: CallState; myId: string; onClose: () => void }) {
  const [status, setStatus]   = useState<'ringing' | 'connecting' | 'connected'>('ringing');
  const [muted, setMuted]     = useState(false);
  const [camOff, setCamOff]   = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pcRef      = useRef<RTCPeerConnection | null>(null);
  const localRef   = useRef<HTMLVideoElement>(null);
  const remoteRef  = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const closedRef  = useRef(false);

  const cleanup = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    onClose();
  }, [onClose]);

  const hangUp = useCallback(() => {
    getSocket().emit('call:end', { to: call.peerId });
    cleanup();
  }, [call.peerId, cleanup]);

  useEffect(() => {
    const socket = getSocket();
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true, video: call.callType === 'video',
        });
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = e => {
          if (remoteRef.current && e.streams[0]) remoteRef.current.srcObject = e.streams[0];
          setStatus('connected');
          if (!timer) timer = setInterval(() => setSeconds(s => s + 1), 1000);
        };
        pc.onicecandidate = e => {
          if (e.candidate) socket.emit('call:ice', { to: call.peerId, candidate: e.candidate });
        };
        pc.onconnectionstatechange = () => {
          if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) cleanup();
        };

        if (call.direction === 'outgoing') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('call:offer', { to: call.peerId, offer, callType: call.callType, from: myId });
        } else if (call.offer) {
          setStatus('connecting');
          await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:answer', { to: call.peerId, answer });
        }
      } catch {
        toast.error('Could not access camera / microphone');
        hangUp();
      }
    };

    const onAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      setStatus('connecting');
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };
    const onIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
    };
    const onEnd    = () => { toast('Call ended'); cleanup(); };
    const onReject = () => { toast('Call declined'); cleanup(); };

    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:end', onEnd);
    socket.on('call:reject', onReject);
    start();

    return () => {
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:end', onEnd);
      socket.off('call:reject', onReject);
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };
  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(c => !c);
  };
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 flex flex-col">
      {/* Remote video (or avatar for audio calls) */}
      <div className="flex-1 relative flex items-center justify-center">
        {call.callType === 'video' ? (
          <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-contain bg-slate-900"/>
        ) : (
          <video ref={remoteRef} autoPlay playsInline className="hidden"/>
        )}
        {(call.callType === 'audio' || status !== 'connected') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {call.peerAvatar
              ? <img src={call.peerAvatar} alt="" className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10"/>
              : <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center text-4xl font-bold ring-4 ring-white/10">{call.peerName[0]?.toUpperCase()}</div>}
            <p className="text-white text-xl font-bold">{call.peerName}</p>
            <p className="text-slate-400 text-sm font-medium">
              {status === 'connected' ? mmss : status === 'connecting' ? 'Connecting…' : call.direction === 'outgoing' ? `${call.callType === 'video' ? 'Video' : 'Voice'} calling…` : 'Incoming…'}
            </p>
          </div>
        )}
        {status === 'connected' && call.callType === 'video' && (
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-semibold bg-black/40 px-3 py-1 rounded-full">{call.peerName} · {mmss}</p>
        )}

        {/* Local preview */}
        {call.callType === 'video' && (
          <video ref={localRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-28 sm:w-40 rounded-xl border-2 border-white/20 shadow-xl bg-slate-800 object-cover"/>
        )}
        {call.callType === 'audio' && <video ref={localRef} autoPlay playsInline muted className="hidden"/>}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-6 bg-slate-950">
        <button onClick={toggleMute} className={`w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${muted ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`} title={muted ? 'Unmute' : 'Mute'}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {muted
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>}
          </svg>
        </button>
        {call.callType === 'video' && (
          <button onClick={toggleCam} className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${camOff ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`} title={camOff ? 'Camera on' : 'Camera off'}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </button>
        )}
        <button onClick={hangUp} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer" title="End call">
          <svg className="w-7 h-7 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ─── User picker (shared by New group / Add members) ──────────────────────── */

function UserPicker({ selected, onToggle, exclude = [] }: {
  selected: UserStub[];
  onToggle: (u: UserStub) => void;
  exclude?: string[];
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserStub[]>([]);
  const [connections, setConnections] = useState<UserStub[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getConnections().then(r => setConnections(r.data.data.connections ?? [])).catch(() => {});
  }, []);

  const doSearch = (text: string) => {
    setQ(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (!text.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchUsers(text.trim());
        setResults(res.data.data.users ?? []);
      } catch { setResults([]); }
    }, 300);
  };

  const pool = q.trim() ? results : connections;
  const isSel = (id: string) => selected.some(s => s._id === id);

  return (
    <div>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(u => (
            <span key={u._id} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold pl-1 pr-2 py-0.5 rounded-full">
              {u.profilePicture ? <img src={u.profilePicture} alt="" className="w-5 h-5 rounded-full object-cover"/> : <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[9px] font-bold">{nameOf(u)[0]}</span>}
              {nameOf(u)}
              <button onClick={() => onToggle(u)} className="text-blue-400 hover:text-blue-700 cursor-pointer">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={q}
        onChange={e => doSearch(e.target.value)}
        placeholder="Search anyone by name…"
        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
      />
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">{q.trim() ? 'Search results' : 'Your connections'}</p>
      <div className="max-h-52 overflow-y-auto space-y-0.5">
        {pool.filter(u => !exclude.includes(u._id)).map(u => (
          <button
            key={u._id}
            onClick={() => onToggle(u)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${isSel(u._id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
          >
            {u.profilePicture
              ? <img src={u.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
              : <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{nameOf(u)[0]?.toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{nameOf(u)}</p>
              {u.headline && <p className="text-[11px] text-slate-400 truncate">{u.headline}</p>}
            </div>
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 ${isSel(u._id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>{isSel(u._id) ? '✓' : ''}</span>
          </button>
        ))}
        {pool.length === 0 && <p className="text-xs text-slate-400 text-center py-4">{q.trim() ? 'No one found' : 'No connections yet — search anyone above'}</p>}
      </div>
    </div>
  );
}

/* ─── Create group modal ───────────────────────────────────────────────────── */

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState<UserStub[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (u: UserStub) =>
    setMembers(prev => prev.some(m => m._id === u._id) ? prev.filter(m => m._id !== u._id) : [...prev, u]);

  const submit = async () => {
    if (!name.trim()) return toast.error('Give your group a name');
    if (members.length === 0) return toast.error('Invite at least one member');
    setBusy(true);
    try {
      await createGroup(name.trim(), members.map(m => m._id), avatar ?? undefined);
      toast.success('Group created — invites sent! Members join once they accept.');
      onCreated();
    } catch { toast.error('Could not create group'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 mb-4">👥 New group</h3>

        <div className="flex items-center gap-3 mb-4">
          <label className="w-14 h-14 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors flex-shrink-0" title="Group photo">
            {preview ? <img src={preview} alt="" className="w-full h-full object-cover"/> : <span className="text-xl">📷</span>}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0];
              if (f) { setAvatar(f); setPreview(URL.createObjectURL(f)); }
            }}/>
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            placeholder="Group name…"
            autoFocus
            className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <UserPicker selected={members} onToggle={toggle}/>

        <p className="text-[11px] text-slate-400 mt-3">Invited people get a group request — they join only after accepting.</p>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 cursor-pointer">
            {busy ? 'Creating…' : `Create group${members.length ? ` (${members.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Group info drawer ────────────────────────────────────────────────────── */

function GroupInfoDrawer({ conv, myId, onClose, onChanged, onLeft, onProfile }: {
  conv: Conversation; myId: string;
  onClose: () => void; onChanged: () => void; onLeft: () => void;
  onProfile: (id: string) => void;
}) {
  const iAmAdmin = (conv.admins ?? []).includes(myId);
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<UserStub[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(conv.name ?? '');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    try { await fn(); if (okMsg) toast.success(okMsg); onChanged(); }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900">Group info</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg cursor-pointer">×</button>
        </div>

        <div className="p-5 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3"><ConvAvatar conv={conv} size="w-20 h-20"/></div>
          {renaming ? (
            <div className="flex gap-2 justify-center">
              <input value={newName} onChange={e => setNewName(e.target.value)} maxLength={100} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus/>
              <button onClick={() => act(async () => { await renameGroup(conv._id, newName.trim()); setRenaming(false); }, 'Group renamed')} disabled={busy || !newName.trim()} className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl disabled:opacity-40 cursor-pointer">Save</button>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
              {conv.name}
              {iAmAdmin && (
                <button onClick={() => setRenaming(true)} className="text-slate-300 hover:text-blue-600 cursor-pointer" title="Rename group">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
              )}
            </h2>
          )}
          <p className="text-xs text-slate-400 mt-1">{conv.participants.length} members{(conv.pendingMembers?.length ?? 0) > 0 ? ` · ${conv.pendingMembers!.length} invited` : ''}</p>
        </div>

        {/* Members */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Members</p>
            {iAmAdmin && (
              <button onClick={() => { setAdding(true); setToAdd([]); }} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">+ Add members</button>
            )}
          </div>

          {conv.participants.map(p => {
            const isAdmin = (conv.admins ?? []).includes(p._id);
            const isMe = p._id === myId;
            return (
              <div key={p._id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 group transition-colors">
                <div onClick={() => !isMe && onProfile(p._id)} className={`flex items-center gap-2.5 flex-1 min-w-0 ${isMe ? '' : 'cursor-pointer'}`}>
                  {p.profilePicture
                    ? <img src={p.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0"/>
                    : <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{nameOf(p)[0]?.toUpperCase()}</div>}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{isMe ? 'You' : nameOf(p)}</p>
                    {p.headline && <p className="text-[11px] text-slate-400 truncate">{p.headline}</p>}
                  </div>
                </div>
                {isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">Admin</span>}
                {iAmAdmin && !isMe && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => act(() => setGroupAdmin(conv._id, p._id, !isAdmin), isAdmin ? 'Admin removed' : 'Promoted to admin')}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                      title={isAdmin ? 'Remove admin' : 'Make admin'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Remove ${nameOf(p)} from the group?`)) act(() => removeGroupMember(conv._id, p._id), 'Member removed'); }}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                      title="Remove from group"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {(conv.pendingMembers?.length ?? 0) > 0 && (
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-4 mb-2">Invited — waiting to accept</p>
              {conv.pendingMembers!.map(p => (
                <div key={p._id} className="flex items-center gap-2.5 px-2 py-2 opacity-60">
                  {p.profilePicture
                    ? <img src={p.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover"/>
                    : <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">{nameOf(p)[0]?.toUpperCase()}</div>}
                  <p className="text-sm font-medium text-slate-600">{nameOf(p)}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 ml-auto">Pending</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Leave */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => { if (window.confirm('Leave this group?')) act(async () => { await leaveGroup(conv._id); onLeft(); }, 'You left the group'); }}
            className="w-full py-2.5 text-sm font-bold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
          >
            🚪 Leave group
          </button>
        </div>

        {/* Add members modal */}
        {adding && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900 mb-3">Add members</h3>
              <UserPicker
                selected={toAdd}
                onToggle={u => setToAdd(prev => prev.some(m => m._id === u._id) ? prev.filter(m => m._id !== u._id) : [...prev, u])}
                exclude={[...conv.participants.map(p => p._id), ...(conv.pendingMembers ?? []).map(p => p._id)]}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setAdding(false)} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button
                  onClick={() => act(async () => { await addGroupMembers(conv._id, toAdd.map(m => m._id)); setAdding(false); }, 'Invites sent')}
                  disabled={busy || toAdd.length === 0}
                  className="flex-1 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                >Send invites</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Chat window ──────────────────────────────────────────────────────────── */

function ChatWindow({ conv, myId, onBack, onConvChanged, onStartCall, onProfile, onOpenInfo }: {
  conv: Conversation;
  myId: string;
  onBack: () => void;
  onConvChanged: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onProfile: (id: string) => void;
  onOpenInfo: () => void;
}) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [lightbox, setLightbox]   = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs]     = useState(0);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const imgRef      = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const other = conv.isGroup ? null : conv.participants.find(p => p._id !== myId) ?? null;
  const isPendingForMe = !conv.isGroup && conv.status === 'pending' &&
    String(typeof conv.requestedBy === 'string' ? conv.requestedBy : conv.requestedBy?._id) !== myId;

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMessages(conv._id);
      setMessages(res.data.data.messages ?? []);
      scrollDown();
    } catch { toast.error('Could not load messages'); }
    finally { setLoading(false); }
  }, [conv._id]);

  useEffect(() => { load(); }, [load]);

  // Live incoming messages for THIS conversation
  useSocket({
    new_message: (...args: unknown[]) => {
      const data = args[0] as { message: Message; conversationId: string };
      if (data?.conversationId === conv._id) {
        setMessages(prev => [...prev, data.message]);
        scrollDown();
      }
    },
  });

  const pushSent = (m: Message) => { setMessages(prev => [...prev, m]); scrollDown(); };

  const handleSendText = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await sendMessage(conv._id, t);
      pushSent(res.data.data);
      onConvChanged();
    } catch (err: unknown) {
      setText(t);
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not send');
    } finally { setSending(false); }
  };

  const handleSendFile = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) return toast.error('Max file size is 50 MB');
    setSending(true);
    const tid = toast.loading('Uploading…');
    try {
      const res = await sendMediaMessage(conv._id, file);
      pushSent(res.data.data);
      onConvChanged();
      toast.success('Sent', { id: tid });
    } catch { toast.error('Upload failed', { id: tid }); }
    finally { setSending(false); }
  };

  /* Voice notes — press mic to record, press again (or send) to stop & send */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 500) {
          const f = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type });
          handleSendFile(f);
        }
        setRecording(false);
        setRecSecs(0);
      };
      rec.start();
      setRecording(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch { toast.error('Microphone access denied'); }
  };
  const stopRecording = () => recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop();
  const cancelRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = () => {
        recorderRef.current?.stream.getTracks().forEach(t => t.stop());
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        setRecording(false); setRecSecs(0);
      };
      recorderRef.current.stop();
    }
  };

  const title = conv.isGroup ? (conv.name ?? 'Group') : nameOf(other);

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8]">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <button onClick={onBack} className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div
          onClick={() => conv.isGroup ? onOpenInfo() : other && onProfile(other._id)}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
          title={conv.isGroup ? 'Group info' : 'View profile'}
        >
          <ConvAvatar conv={conv} other={other} size="w-10 h-10"/>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{title}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {conv.isGroup
                ? `${conv.participants.length} members — tap for info`
                : other?.headline ?? 'tap for profile'}
            </p>
          </div>
        </div>

        {/* Calls: 1-to-1 only. Group calls need an SFU server and aren't available. */}
        {!conv.isGroup && conv.status === 'active' && (
          <div className="flex items-center gap-1">
            <button onClick={() => onStartCall('audio')} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer" title="Voice call">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </button>
            <button onClick={() => onStartCall('video')} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer" title="Video call">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
          </div>
        )}
        {conv.isGroup && (
          <button onClick={onOpenInfo} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer" title="Group info">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100,116,139,0.06) 1px, transparent 0)', backgroundSize: '22px 22px' }}>
        {loading ? (
          <div className="space-y-3 pt-6">
            {[1,2,3].map(i => <div key={i} className={`h-12 w-52 bg-white/70 rounded-2xl animate-pulse ${i % 2 ? '' : 'ml-auto'}`}/>)}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-16">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-semibold text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Say hello — messages are private to this chat.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            return (
              <div key={m._id}>
                {showDay && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <MessageBubble
                  m={m}
                  mine={senderIdOf(m) === myId}
                  isGroup={!!conv.isGroup}
                  onImageClick={setLightbox}
                  onAuthorClick={onProfile}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef}/>
      </div>

      {/* ── Request bar (recipient of a pending direct chat) ── */}
      {isPendingForMe ? (
        <div className="bg-white border-t border-slate-200 px-4 py-4 flex-shrink-0">
          <p className="text-sm text-slate-600 text-center mb-3">
            <span className="font-bold">{nameOf(other)}</span> wants to message you. Accept to reply.
          </p>
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={async () => { try { await ignoreConversation(conv._id); toast('Request declined'); onBack(); onConvChanged(); } catch { toast.error('Failed'); } }}
              className="flex-1 py-2.5 text-sm font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
            >Decline</button>
            <button
              onClick={async () => { try { await acceptConversation(conv._id); toast.success('Request accepted'); onConvChanged(); } catch { toast.error('Failed'); } }}
              className="flex-1 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer"
            >Accept</button>
          </div>
        </div>
      ) : (
        /* ── Input bar ── */
        <div className="bg-white border-t border-slate-200 px-3 py-2.5 flex items-end gap-1.5 flex-shrink-0">
          {recording ? (
            <div className="flex-1 flex items-center gap-3 px-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"/>
              <span className="text-sm font-bold text-slate-700 tabular-nums">{String(Math.floor(recSecs/60)).padStart(2,'0')}:{String(recSecs%60).padStart(2,'0')}</span>
              <span className="text-xs text-slate-400">Recording voice note…</span>
              <button onClick={cancelRecording} className="ml-auto text-xs font-bold text-slate-400 hover:text-red-500 px-2 py-1 cursor-pointer">Cancel</button>
              <button onClick={stopRecording} className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer" title="Send voice note">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </button>
            </div>
          ) : (
            <>
              {/* Attach: photos & videos */}
              <button onClick={() => imgRef.current?.click()} disabled={sending} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0 cursor-pointer" title="Photo or video">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </button>
              <input ref={imgRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSendFile(f); e.target.value = ''; }}/>

              {/* Attach: any file */}
              <button onClick={() => fileRef.current?.click()} disabled={sending} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex-shrink-0 cursor-pointer" title="Attach file">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSendFile(f); e.target.value = ''; }}/>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                rows={1}
                placeholder="Type a message…"
                className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm resize-none max-h-28 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 focus:bg-white transition-colors"
                style={{ minHeight: '42px' }}
              />

              {text.trim() ? (
                <button onClick={handleSendText} disabled={sending} className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors cursor-pointer" title="Send">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              ) : (
                <button onClick={startRecording} disabled={sending} className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer" title="Record voice note">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl"/>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const myId = user?.id ?? '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [invites,       setInvites]       = useState<Conversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [listTab,       setListTab]       = useState<'chats' | 'requests' | 'invites'>('chats');
  const [q,             setQ]             = useState('');
  const [showNewGroup,  setShowNewGroup]  = useState(false);
  const [showInfo,      setShowInfo]      = useState(false);
  const [call,          setCall]          = useState<CallState | null>(null);
  const [incoming,      setIncoming]      = useState<{ from: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' } | null>(null);

  const load = useCallback(async (keepSelection = true) => {
    try {
      const res = await getConversations();
      const d = res.data.data;
      // Backwards compatible: old API returned an array
      const convs: Conversation[] = Array.isArray(d) ? d : (d.conversations ?? []);
      const inv:   Conversation[] = Array.isArray(d) ? [] : (d.groupInvites ?? []);
      setConversations(convs);
      setInvites(inv);
      if (!keepSelection) setSelectedId(null);
    } catch { toast.error('Could not load chats'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep-link: /messages?user=<id> starts/opens a direct chat
  useEffect(() => {
    const target = searchParams.get('user');
    if (!target || !myId) return;
    startConversation(target)
      .then(res => { setSelectedId(res.data.data._id); load(); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, myId]);

  // Socket: refresh list on chat events; ring on incoming calls
  useSocket({
    new_message:           () => load(),
    conversation_request:  () => { load(); toast('📩 New message request'); },
    conversation_accepted: () => load(),
    group_invite:          () => { load(); toast('👥 New group invite'); },
    group_update:          () => load(),
    'call:offer':          (...args: unknown[]) => {
      const data = args[0] as { from: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' };
      if (data?.from) setIncoming(data);
    },
  });

  const selected = conversations.find(c => c._id === selectedId) ?? null;

  const isPending = (c: Conversation) => !c.isGroup && c.status === 'pending';
  const requestsForMe = conversations.filter(c =>
    isPending(c) && String(typeof c.requestedBy === 'string' ? c.requestedBy : c.requestedBy?._id) !== myId);

  const chatList = conversations.filter(c => {
    if (listTab === 'requests') return requestsForMe.includes(c);
    // "chats": everything except requests waiting on me
    if (requestsForMe.includes(c)) return false;
    if (!q.trim()) return true;
    const other = c.isGroup ? null : c.participants.find(p => p._id !== myId);
    const title = c.isGroup ? (c.name ?? '') : nameOf(other);
    return title.toLowerCase().includes(q.trim().toLowerCase());
  });

  const unreadOf = (c: Conversation) => c.unreadCount?.[myId] ?? 0;

  const startCall = (type: 'audio' | 'video') => {
    if (!selected || selected.isGroup) return;
    const other = selected.participants.find(p => p._id !== myId);
    if (!other) return;
    setCall({ peerId: other._id, peerName: nameOf(other), peerAvatar: other.profilePicture, callType: type, direction: 'outgoing' });
  };

  const answerIncoming = () => {
    if (!incoming) return;
    // Find caller details from any conversation
    let caller: UserStub | undefined;
    for (const c of conversations) {
      const f = c.participants.find(p => p._id === incoming.from);
      if (f) { caller = f; break; }
    }
    setCall({
      peerId: incoming.from,
      peerName: caller ? nameOf(caller) : 'Caller',
      peerAvatar: caller?.profilePicture,
      callType: incoming.callType ?? 'audio',
      direction: 'incoming',
      offer: incoming.offer,
    });
    setIncoming(null);
  };

  const rejectIncoming = () => {
    if (incoming) getSocket().emit('call:reject', { to: incoming.from });
    setIncoming(null);
  };

  const incomingCallerName = (() => {
    if (!incoming) return '';
    for (const c of conversations) {
      const f = c.participants.find(p => p._id === incoming.from);
      if (f) return nameOf(f);
    }
    return 'Someone';
  })();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-0 sm:px-4 py-0 sm:py-5">
        <div className="bg-white sm:border sm:border-slate-200 sm:rounded-2xl sm:shadow-sm overflow-hidden flex" style={{ height: 'calc(100vh - 110px)' }}>

          {/* ── Left: chat list ── */}
          <aside className={`w-full sm:w-[340px] sm:border-r border-slate-200 flex-col flex-shrink-0 ${selectedId ? 'hidden sm:flex' : 'flex'}`}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-900">Messages</h1>
              <button
                onClick={() => setShowNewGroup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
                title="Create a group chat"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                New group
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <svg className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search chats…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pb-2">
              {([
                ['chats',    'Chats',    0],
                ['requests', 'Requests', requestsForMe.length],
                ['invites',  'Invites',  invites.length],
              ] as const).map(([id, label, badge]) => (
                <button
                  key={id}
                  onClick={() => setListTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${listTab === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {label}
                  {badge > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${listTab === id ? 'bg-white/20' : 'bg-red-500 text-white'}`}>{badge}</span>}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto border-t border-slate-100">
              {loading ? (
                <div className="p-4 space-y-3">{[1,2,3,4].map(i => <div key={i} className="flex gap-3 animate-pulse"><div className="w-12 h-12 rounded-full bg-slate-100"/><div className="flex-1 space-y-2 py-1.5"><div className="h-3 bg-slate-100 rounded-full w-1/2"/><div className="h-2.5 bg-slate-50 rounded-full w-3/4"/></div></div>)}</div>

              ) : listTab === 'invites' ? (
                invites.length === 0
                  ? <p className="text-center text-sm text-slate-400 py-14">No group invites</p>
                  : invites.map(g => (
                      <div key={g._id} className="px-4 py-3 border-b border-slate-50">
                        <div className="flex items-center gap-3 mb-2.5">
                          <ConvAvatar conv={g}/>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 text-sm truncate">{g.name}</p>
                            <p className="text-xs text-slate-400 truncate">
                              Invited by {nameOf(typeof g.requestedBy === 'object' ? g.requestedBy as UserStub : null)} · {g.participants.length} members
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => { try { await respondGroupInvite(g._id, false); toast('Invite declined'); load(); } catch { toast.error('Failed'); } }}
                            className="flex-1 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                          >Decline</button>
                          <button
                            onClick={async () => { try { await respondGroupInvite(g._id, true); toast.success(`Joined "${g.name}"!`); setListTab('chats'); load(); } catch { toast.error('Failed'); } }}
                            className="flex-1 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer"
                          >Join group</button>
                        </div>
                      </div>
                    ))

              ) : chatList.length === 0 ? (
                <div className="text-center py-14 px-6">
                  <p className="text-3xl mb-2">{listTab === 'requests' ? '📭' : '💬'}</p>
                  <p className="text-sm font-bold text-slate-600">{listTab === 'requests' ? 'No message requests' : 'No chats yet'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {listTab === 'requests'
                      ? 'When someone new messages you, it shows up here first.'
                      : 'Open someone\'s profile and hit "Message", or create a group.'}
                  </p>
                </div>
              ) : (
                chatList.map(c => {
                  const other = c.isGroup ? null : c.participants.find(p => p._id !== myId);
                  const title = c.isGroup ? (c.name ?? 'Group') : nameOf(other);
                  const unread = unreadOf(c);
                  const mineIsPending = isPending(c) && !requestsForMe.includes(c);
                  return (
                    <button
                      key={c._id}
                      onClick={() => { setSelectedId(c._id); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 cursor-pointer ${selectedId === c._id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <div className="relative flex-shrink-0">
                        <ConvAvatar conv={c} other={other}/>
                        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{title}</p>
                          <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{listTime(c.lastMessageAt)}</span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                          {mineIsPending ? '⏳ Request sent — waiting to be accepted' : (c.lastMessage || (c.isGroup ? 'Group created' : 'Start the conversation'))}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Right: chat window ── */}
          <section className={`flex-1 min-w-0 ${selectedId ? 'flex' : 'hidden sm:flex'} flex-col`}>
            {selected ? (
              <ChatWindow
                key={selected._id}
                conv={selected}
                myId={myId}
                onBack={() => setSelectedId(null)}
                onConvChanged={() => load()}
                onStartCall={startCall}
                onProfile={id => navigate(`/profile/${id}`)}
                onOpenInfo={() => setShowInfo(true)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#f7f9fb] text-center px-8">
                <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl mb-4">💬</div>
                <p className="font-bold text-slate-700">Your messages</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">Pick a chat, accept a request, or create a group. Send text, photos, videos, files and voice notes — and make audio or video calls in 1-to-1 chats.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Create group */}
      {showNewGroup && (
        <CreateGroupModal onClose={() => setShowNewGroup(false)} onCreated={() => { setShowNewGroup(false); load(); }}/>
      )}

      {/* Group info drawer */}
      {showInfo && selected?.isGroup && (
        <GroupInfoDrawer
          conv={selected}
          myId={myId}
          onClose={() => setShowInfo(false)}
          onChanged={() => load()}
          onLeft={() => { setShowInfo(false); setSelectedId(null); load(); }}
          onProfile={id => { setShowInfo(false); navigate(`/profile/${id}`); }}
        />
      )}

      {/* Incoming call prompt */}
      {incoming && !call && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[75] bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 w-[92%] max-w-sm">
          <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{incomingCallerName}</p>
            <p className="text-xs text-slate-400">Incoming {incoming.callType === 'video' ? 'video' : 'voice'} call…</p>
          </div>
          <button onClick={rejectIncoming} className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center cursor-pointer" title="Decline">
            <svg className="w-5 h-5 rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </button>
          <button onClick={answerIncoming} className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center cursor-pointer" title="Answer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </button>
        </div>
      )}

      {/* Active call */}
      {call && <CallOverlay call={call} myId={myId} onClose={() => setCall(null)}/>}
    </div>
  );
}
