import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { requireDatabase } from '../middleware/errorHandler.js';
import User from '../models/user.model.js';
import { createAuditLog } from '../services/audit.service.js';

const router = express.Router();

// GET /api/users — list users (admin only)
router.get('/', authenticate, authorize('ADMIN'), requireDatabase, async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: { users } });
  } catch (error) { next(error); }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

export default router;
