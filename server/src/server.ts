import 'dotenv/config';
import dns from 'dns';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import connectDB from './infrastructure/database/connection';

/**
 * Opt-in DNS override for networks whose default resolver can't resolve
 * MongoDB Atlas's `mongodb+srv://` SRV records (common on some ISPs,
 * restrictive routers, or misconfigured Windows DNS). OFF by default —
 * forcing every DNS lookup through public resolvers can break things on
 * networks with their own internal DNS (corporate VPNs, etc.), so this
 * only activates if USE_PUBLIC_DNS=true is explicitly set in .env.
 */
if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
  console.log('🌐 Using public DNS servers (1.1.1.1, 8.8.8.8) for all lookups — USE_PUBLIC_DNS=true');
}

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

app.locals.io = io;

io.on('connection', (socket) => {
  socket.on('join', (userId: string) => {
    if (userId) {
      socket.join(`user:${userId}`);
      socket.join('feed'); // all connected users join the feed room for real-time post updates
      (socket.data as any).userId = userId;
    }
  });
  socket.on('join_admin', () => {
    socket.join('admin');
  });

  // ── 1-to-1 WebRTC call signaling ─────────────────────────────────────────
  // The server only relays SDP/ICE between the two peers; media flows P2P.
  // Group calls are NOT supported here — they require an SFU (e.g. LiveKit).
  const me = () => (socket.data as any).userId as string | undefined;

  socket.on('call:offer', ({ to, offer, callType, from }) => {
    if (to) io.to(`user:${to}`).emit('call:offer', { from: from ?? me(), offer, callType });
  });
  socket.on('call:answer', ({ to, answer }) => {
    if (to) io.to(`user:${to}`).emit('call:answer', { from: me(), answer });
  });
  socket.on('call:ice', ({ to, candidate }) => {
    if (to) io.to(`user:${to}`).emit('call:ice', { from: me(), candidate });
  });
  socket.on('call:reject', ({ to }) => {
    if (to) io.to(`user:${to}`).emit('call:reject', { from: me() });
  });
  socket.on('call:end', ({ to }) => {
    if (to) io.to(`user:${to}`).emit('call:end', { from: me() });
  });

  socket.on('disconnect', () => {});
});

connectDB().then((connected) => {
  if (!connected) {
    console.warn('⚠️  Starting server WITHOUT a database connection. Fix MONGO_URI and restart for full functionality.');
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 NextHire server → http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready`);
  });

  process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
  process.on('SIGINT', () => httpServer.close(() => process.exit(0)));
});
