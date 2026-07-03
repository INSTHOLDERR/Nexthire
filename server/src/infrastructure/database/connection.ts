import mongoose from 'mongoose';

/**
 * Connects to MongoDB but does NOT crash the process on failure.
 *
 * Previously this called process.exit(1) on error, which meant the entire
 * server — including routes with zero database dependency, like admin
 * login — became unreachable the moment Mongo failed to connect (wrong
 * password, DNS/SRV lookup failure, IP not whitelisted on Atlas, etc.).
 * One optional dependency failing should never take down the whole app.
 *
 * Returns true/false so server.ts can log clearly without exiting.
 */
const connectDB = async (): Promise<boolean> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ MONGO_URI is not defined — database-backed routes will fail until it is set.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${(error as Error).message}`);
    console.error('⚠️  Server will still start, but database-backed routes (register, login, etc.) will fail until this is fixed.');
    return false;
  }
};

export default connectDB;
