import express from 'express';
import { body, validationResult } from 'express-validator';
import { loginUser } from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';
import User from '../models/user.model.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() } });
    }
    const { username, password } = req.body;
    const { token, user } = await loginUser({
      username, password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, data: { token, user } });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await createAuditLog({
      action: 'LOGOUT',
      userId: req.user._id,
      username: req.user.username,
      description: `User ${req.user.username} logged out`,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
