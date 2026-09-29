import logger from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, path: req.path });

  const statusCode = err.statusCode || err.status || 500;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: Object.values(err.errors).map(e => e.message),
      },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${field || 'value'} already exists.`,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Authentication token is invalid.' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Authentication token has expired.' },
    });
  }

  // Application errors
  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      error: { code: err.code || 'APPLICATION_ERROR', message: err.message },
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : err.message,
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`,
    },
  });
}

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APPLICATION_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware: rejects the request immediately (503) when MongoDB is not connected.
 * Attach to any route that requires DB access so it never reaches Mongoose buffers.
 * Import isDatabaseConnected lazily to avoid circular-dep issues.
 */
export async function requireDatabase(req, res, next) {
  const { isDatabaseConnected } = await import('../config/database.js');
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'This feature requires a database connection. The platform is running in Demo Mode — database features are unavailable.',
        demoMode: true,
      },
    });
  }
  next();
}
