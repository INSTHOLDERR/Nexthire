import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log( `✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(  `❌ MongoDB error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;