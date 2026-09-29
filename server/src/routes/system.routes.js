import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { createInitialAdmin, createDemoUsers } from '../services/auth.service.js';
import { isDatabaseConnected } from '../config/database.js';
import { demoStore } from '../services/demoStore.service.js';

const router = express.Router();

// GET /api/system/health
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      service: 'SIH26183 Blockchain Investigation Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      demoMode: process.env.DEMO_MODE === 'true',
    },
  });
});

// POST /api/system/seed — seed initial data (admin only)
router.post('/seed', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    await createInitialAdmin();
    await createDemoUsers();
    res.json({ success: true, message: 'Seed data created.' });
  } catch (error) { next(error); }
});

// GET /api/system/stats — platform statistics
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    // Return demo stats immediately when DB is unavailable
    if (!isDatabaseConnected()) {
      return res.json({ success: true, data: demoStore.getStats() });
    }

    const [
      { default: Case },
      { default: Investigation },
      { default: Alert },
      { default: Wallet },
    ] = await Promise.all([
      import('../models/case.model.js'),
      import('../models/investigation.model.js'),
      import('../models/alert.model.js'),
      import('../models/wallet.model.js'),
    ]);

    const [cases, investigations, alerts, wallets] = await Promise.all([
      Case.countDocuments(),
      Investigation.countDocuments(),
      Alert.countDocuments({ status: 'UNREAD' }),
      Wallet.countDocuments(),
    ]);

    res.json({
      success: true,
      data: { cases, investigations, unreadAlerts: alerts, wallets },
    });
  } catch (error) { next(error); }
});

export default router;
