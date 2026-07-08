import mongoose from 'mongoose';


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
