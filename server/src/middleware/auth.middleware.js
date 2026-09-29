import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { AppError } from './errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required.', 401, 'AUTH_REQUIRED');
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Demo-mode fast path ──────────────────────────────────────────────────
    // When the token carries an embedded demoUser payload (set by loginDemo),
    // reconstruct req.user from the token itself — no DB query needed.
    if (decoded.demoUser) {
      req.user = decoded.demoUser;
      req.isDemoSession = true;
      return next();
    }

    // ── Normal DB-backed path ────────────────────────────────────────────────
    if (!isDatabaseConnected()) {
      // DB is down and this is not a demo token — reject cleanly.
      throw new AppError(
        'Database unavailable. Please use demo credentials in Demo Mode.',
        503,
        'DATABASE_UNAVAILABLE'
      );
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated.', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('Insufficient permissions.', 403, 'FORBIDDEN'));
    }
    next();
  };
}
