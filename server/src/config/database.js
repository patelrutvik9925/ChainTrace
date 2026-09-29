import mongoose from 'mongoose';
import logger from './logger.js';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sih183_blockchain_investigation';
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    logger.warn('Running without database connection - some features will be unavailable');
    // Don't crash in dev — allow demo mode to work
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err.message);
  });
}

/**
 * Returns true only when Mongoose has an open, ready connection.
 * Safe to call synchronously — never throws, never waits.
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
