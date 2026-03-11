import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not defined. Database connection will not be established.');
}

// Cache connection promise on globalThis to reuse across warm serverless invocations
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = globalThis as unknown as { __mongooseCache?: MongooseCache };

const cached: MongooseCache = g.__mongooseCache ?? { conn: null, promise: null };
if (!g.__mongooseCache) {
  g.__mongooseCache = cached;
}

const SERVER_SELECTION_TIMEOUT_MS = 10000;
const CONNECT_TIMEOUT_MS = 10000;

export async function connectDB(): Promise<typeof mongoose> {
  // If we already have a ready connection, return it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If a connection attempt is already in progress, wait for it
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
        connectTimeoutMS: CONNECT_TIMEOUT_MS,
      })
      .then((m) => {
        console.log('MongoDB connected successfully');
        return m;
      })
      .catch((error) => {
        // Reset promise so next call can retry
        cached.promise = null;
        cached.conn = null;
        console.error('MongoDB connection error:', error);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default mongoose;
