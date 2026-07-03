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
    if (userId) socket.join(`user:${userId}`);
  });
  socket.on('join_admin', () => {
    socket.join('admin');
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
