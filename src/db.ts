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
  lastAttempt: number;
  retryCount: number;
}

const g = globalThis as unknown as { __mongooseCache?: MongooseCache };

const cached: MongooseCache = g.__mongooseCache ?? {
  conn: null,
  promise: null,
  lastAttempt: 0,
  retryCount: 0
};
if (!g.__mongooseCache) {
  g.__mongooseCache = cached;
}

// Connection configuration optimized for Vercel serverless
const SERVER_SELECTION_TIMEOUT_MS = 5000; // Reduced for faster failure
const CONNECT_TIMEOUT_MS = 10000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// Enhanced error messages for common connection issues
function getConnectionErrorMessage(error: any): string {
  const errorMsg = error?.message || String(error);

  if (errorMsg.includes('IP') && errorMsg.includes('whitelist')) {
    return 'Database connection blocked: MongoDB Atlas IP whitelist issue. ' +
           'Vercel serverless IPs need to be whitelisted. ' +
           'Consider using 0.0.0.0/0 (allow all IPs) in MongoDB Atlas Network Access settings.';
  }

  if (errorMsg.includes('authentication failed')) {
    return 'Database authentication failed. Check MONGODB_URI credentials.';
  }

  if (errorMsg.includes('Could not connect to any servers')) {
    return 'Cannot reach MongoDB servers. Check network connectivity and MongoDB Atlas status.';
  }

  return `Database connection error: ${errorMsg}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function connectDB(): Promise<typeof mongoose> {
  // If we already have a ready connection, return it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If a connection attempt is already in progress, wait for it
  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      // Promise failed, will retry below
      cached.promise = null;
    }
  }

  // Implement retry logic with exponential backoff
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        const backoffDelay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`MongoDB connection retry ${attempt}/${MAX_RETRY_ATTEMPTS} after ${backoffDelay}ms`);
        await sleep(backoffDelay);
      }

      cached.promise = mongoose
        .connect(MONGODB_URI, {
          bufferCommands: false,
          serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
          connectTimeoutMS: CONNECT_TIMEOUT_MS,
          maxPoolSize: 10, // Limit connection pool for serverless
          minPoolSize: 1,
          retryWrites: true,
          retryReads: true,
        })
        .then((m) => {
          console.log('MongoDB connected successfully');
          cached.retryCount = 0;
          return m;
        });

      cached.conn = await cached.promise;
      cached.lastAttempt = Date.now();
      return cached.conn;

    } catch (error) {
      lastError = error;
      cached.promise = null;
      cached.conn = null;
      cached.retryCount = attempt + 1;
      cached.lastAttempt = Date.now();

      const errorMessage = getConnectionErrorMessage(error);
      console.error(`MongoDB connection attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} failed:`, errorMessage);

      // Don't retry on authentication or configuration errors
      if (errorMessage.includes('authentication') || errorMessage.includes('credentials')) {
        throw new Error(errorMessage);
      }
    }
  }

  // All retries exhausted
  const finalError = getConnectionErrorMessage(lastError);
  console.error('MongoDB connection failed after all retries:', finalError);
  throw new Error(finalError);
}

export default mongoose;
