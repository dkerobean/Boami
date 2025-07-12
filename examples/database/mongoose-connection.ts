import mongoose from 'mongoose';

/**
 * MongoDB connection configuration and management
 * Follows best practices for connection pooling and error handling
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boami';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global connection cache to prevent multiple connections in development
 * Reason: Next.js hot reloading can create multiple connections without caching
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * Connects to MongoDB with proper error handling and connection pooling
 * @returns Promise<typeof mongoose> - Mongoose connection instance
 * @throws {Error} When connection fails
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

/**
 * Gracefully closes the MongoDB connection
 * Useful for cleanup in tests or application shutdown
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('🔌 MongoDB disconnected');
  }
}

/**
 * Checks if MongoDB connection is ready
 * @returns boolean - Connection status
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Connection event handlers for monitoring
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});