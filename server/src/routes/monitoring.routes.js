import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDatabase } from '../middleware/errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';
import Wallet from '../models/wallet.model.js';
import { createAuditLog } from '../services/audit.service.js';
import { demoStore } from '../services/demoStore.service.js';

const router = express.Router();

// GET /api/monitoring — list monitored wallets
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      // Demo fallback: return the demo wallet(s) that have isMonitored=true
      const allWallets = demoStore.getWallets();
      const monitored = allWallets.filter(w => w.isMonitored);
      return res.json({
        success: true,
        data: {
          wallets: monitored.map(w => ({
            ...w,
            case: { _id: w.case, caseId: 'SIH26183-001', caseName: 'Demo Investigation — Fraud Case' },
          })),
          isDemo: true,
        },
      });
    }

    const { caseId } = req.query;
    const filter = { isMonitored: true };
    if (caseId) filter.case = caseId;
    const wallets = await Wallet.find(filter).populate('case', 'caseId caseName');
    res.json({ success: true, data: { wallets } });
  } catch (error) { next(error); }
});

// POST /api/monitoring/start
router.post('/start', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      const { walletAddress, caseId } = req.body;
      // Demo: acknowledge the action, return a synthetic wallet object
      const allWallets = demoStore.getWallets();
      const found = allWallets.find(w => w.address === walletAddress) || allWallets[0];
      const wallet = {
        ...found,
        isMonitored: true,
        monitoringSince: new Date().toISOString(),
        isDemo: true,
      };
      return res.json({ success: true, data: { wallet, isDemo: true } });
    }

    const { walletAddress, caseId } = req.body;
    const wallet = await Wallet.findOneAndUpdate(
      { address: walletAddress, case: caseId },
      { isMonitored: true, monitoringSince: new Date() },
      { new: true }
    );
    if (!wallet) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Wallet not found.' } });
    await createAuditLog({
      action: 'MONITORING_STARTED',
      userId: req.user._id,
      username: req.user.username,
      caseId,
      objectType: 'WALLET',
      objectId: walletAddress,
      description: `Monitoring started: ${walletAddress}`,
    });
    res.json({ success: true, data: { wallet } });
  } catch (error) { next(error); }
});

// POST /api/monitoring/stop
router.post('/stop', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      const { walletAddress } = req.body;
      const allWallets = demoStore.getWallets();
      const found = allWallets.find(w => w.address === walletAddress) || allWallets[0];
      const wallet = { ...found, isMonitored: false, isDemo: true };
      return res.json({ success: true, data: { wallet, isDemo: true } });
    }

    const { walletAddress, caseId } = req.body;
    const wallet = await Wallet.findOneAndUpdate(
      { address: walletAddress, case: caseId },
      { isMonitored: false },
      { new: true }
    );
    if (!wallet) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Wallet not found.' } });
    await createAuditLog({
      action: 'MONITORING_STOPPED',
      userId: req.user._id,
      username: req.user.username,
      caseId,
      objectType: 'WALLET',
      objectId: walletAddress,
      description: `Monitoring stopped: ${walletAddress}`,
    });
    res.json({ success: true, data: { wallet } });
  } catch (error) { next(error); }
});

export default router;
