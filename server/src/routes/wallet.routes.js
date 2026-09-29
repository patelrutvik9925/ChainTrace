import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDatabase } from '../middleware/errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';
import Wallet from '../models/wallet.model.js';
import { createAuditLog } from '../services/audit.service.js';
import { demoStore } from '../services/demoStore.service.js';
import {
  validateWalletAddress,
  validateAndCheckDuplicate,
  collectWalletData,
  getWalletProfile,
} from '../services/wallet.service.js';

const router = express.Router();

// ── POST /api/wallets/validate — pure address validation (no DB, no network) ──
router.post('/validate', authenticate, async (req, res, next) => {
  try {
    const { address, chain = 'TRON', caseId } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'address is required.' } });
    }
    const result = await validateAndCheckDuplicate(address.trim(), chain, caseId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// ── POST /api/wallets/collect — validate + fetch blockchain data ───────────────
// Demo-safe: returns demo data instantly when DEMO_MODE=true and no DB
router.post('/collect', authenticate, async (req, res, next) => {
  try {
    const { address, chain = 'TRON', token = 'USDT' } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'address is required.' } });
    }
    const validation = await validateWalletAddress(address.trim(), chain);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ADDRESS', message: validation.reason } });
    }
    const data = await collectWalletData(address.trim(), chain, token);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// ── GET /api/wallets/profile/:address — wallet intelligence profile ────────────
router.get('/profile/:address', authenticate, async (req, res, next) => {
  try {
    const { chain = 'TRON' } = req.query;
    const profile = await getWalletProfile(req.params.address, chain);
    res.json({ success: true, data: { profile } });
  } catch (error) { next(error); }
});

// ── GET /api/wallets — list wallets for a case ────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      let wallets = demoStore.getWallets();
      const { classification, riskLevel } = req.query;
      if (classification) wallets = wallets.filter(w => w.classification === classification);
      if (riskLevel) wallets = wallets.filter(w => w.riskLevel === riskLevel);
      return res.json({ success: true, data: { wallets, total: wallets.length, demoMode: true } });
    }
    const { caseId, classification, riskLevel, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (caseId) filter.case = caseId;
    if (classification) filter.classification = classification;
    if (riskLevel) filter.riskLevel = riskLevel;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [wallets, total] = await Promise.all([
      Wallet.find(filter).sort({ hopDepth: 1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Wallet.countDocuments(filter),
    ]);
    res.json({ success: true, data: { wallets, total } });
  } catch (error) { next(error); }
});

// ── GET /api/wallets/:address — single wallet lookup ──────────────────────────
router.get('/:address', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      const demoWallet = demoStore.getWallets().find(w => w.address === req.params.address);
      if (demoWallet) return res.json({ success: true, data: { wallet: demoWallet, demoMode: true } });
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Wallet not found.' } });
    }
    const wallet = await Wallet.findOne({ address: req.params.address }).populate('case', 'caseId caseName');
    if (!wallet) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Wallet not found.' } });
    res.json({ success: true, data: { wallet } });
  } catch (error) { next(error); }
});

// ── POST /api/wallets — add wallet to case ────────────────────────────────────
// Validates the address first; in demo mode records to in-memory (no DB needed)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { address, blockchain = 'TRON', token = 'USDT', caseId, isOriginalReported } = req.body;
    if (!address || !caseId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'address and caseId are required.' } });
    }

    // Always validate address format first
    const validation = await validateWalletAddress(address.trim(), blockchain);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ADDRESS', message: validation.reason } });
    }

    // Demo mode: return demo wallet data without DB write
    if (!isDatabaseConnected()) {
      const demoWallet = demoStore.getWallets().find(w => w.address === address.trim());
      const result = demoWallet || {
        _id: `demo-wallet-new-${Date.now()}`,
        address: address.trim(),
        blockchain,
        token,
        case: caseId,
        classification: isOriginalReported ? 'REPORTED_SUSPECT' : 'UNKNOWN',
        riskLevel: 'MEDIUM',
        hopDepth: isOriginalReported ? 0 : null,
        isOriginalReported: !!isOriginalReported,
        stats: { transactionCount: 0, totalReceived: '0', totalSent: '0' },
        isDemo: true,
        createdAt: new Date().toISOString(),
      };
      return res.status(201).json({
        success: true,
        data: { wallet: result, demoMode: true },
        message: 'Demo mode: wallet recorded in memory. Connect MongoDB to persist.',
      });
    }

    // DB-backed path: check for duplicates
    const existing = await Wallet.findOne({ address: address.trim(), case: caseId });
    if (existing) {
      return res.json({ success: true, data: { wallet: existing, alreadyExisted: true } });
    }

    const wallet = new Wallet({
      address: address.trim(),
      blockchain,
      token,
      case: caseId,
      addedBy: req.user._id,
      isOriginalReported: !!isOriginalReported,
      classification: isOriginalReported ? 'REPORTED_SUSPECT' : 'UNKNOWN',
      hopDepth: isOriginalReported ? 0 : undefined,
    });
    await wallet.save();

    await createAuditLog({
      action: 'WALLET_ADDED',
      userId: req.user._id,
      username: req.user.username,
      caseId,
      objectType: 'WALLET',
      objectId: address.trim(),
      description: `Wallet added: ${address.trim()} (${blockchain})`,
    });

    res.status(201).json({ success: true, data: { wallet } });
  } catch (error) { next(error); }
});

export default router;
