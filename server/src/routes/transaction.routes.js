/**
 * Transactions API Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes:
 *   GET  /api/transactions            — list normalized transactions (w/ filter + pagination)
 *   POST /api/transactions/collect    — trigger blockchain data collection for an address
 *   GET  /api/transactions/:hash      — single transaction by hash
 *
 * Architecture:
 *   Route → tron.collection.service → TronAdapter → Normalized TX
 *
 * All routes are demo-safe. DB is NOT required.
 * Data source is always disclosed in the response.
 */

import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { isDatabaseConnected } from '../config/database.js';
import Transaction from '../models/transaction.model.js';
import { demoStore } from '../services/demoStore.service.js';
import {
  collectTrc20Transactions,
  getStoredTransactions,
} from '../services/blockchain/tron.collection.service.js';
import { validateWalletAddress } from '../services/wallet.service.js';
import { createAuditLog } from '../services/audit.service.js';

const router = express.Router();

// ── GET /api/transactions — list transactions ─────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { address, caseId, chain = 'TRON', token, page = 1, limit = 50 } = req.query;

    const result = await getStoredTransactions({ address, caseId, chain, token, page, limit });

    res.json({
      success: true,
      data: {
        transactions: result.transactions,
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        isDemo: result.isDemo,
        dataSource: result.dataSource,
      },
    });
  } catch (error) { next(error); }
});

// ── POST /api/transactions/collect — collect blockchain data for a wallet ─────
// Triggers TronGrid API call → normalize → persist → return results
router.post('/collect', authenticate, async (req, res, next) => {
  try {
    const { address, chain = 'TRON', token = 'USDT', caseId, investigationId, limit = 50 } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'address is required.' },
      });
    }

    // Validate address format before hitting the provider
    const validation = await validateWalletAddress(address.trim(), chain);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: validation.reason },
      });
    }

    // Only TRON is fully implemented; other chains return architecture-ready stubs
    if (chain !== 'TRON') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CHAIN_NOT_SUPPORTED',
          message: `Live data collection for ${chain} is architecture-ready but not yet activated. Use TRON for primary investigation.`,
        },
      });
    }

    const result = await collectTrc20Transactions(
      address.trim(),
      caseId,
      investigationId,
      { token, limit: Math.min(parseInt(limit), 200) }
    );

    // Record audit event (silently skipped if no DB)
    await createAuditLog({
      action: 'BLOCKCHAIN_DATA_COLLECTED',
      userId: req.user._id,
      username: req.user.username,
      caseId,
      objectType: 'WALLET',
      objectId: address.trim(),
      description: `Blockchain data collected: ${result.summary.total} ${token} transfers on ${chain}`,
      result: result.success ? 'SUCCESS' : 'PARTIAL',
      metadata: {
        dataSource: result.dataSource,
        isLive: result.isLive,
        transactionCount: result.summary.total,
      },
    });

    res.json({
      success: true,
      data: {
        address: result.address,
        chain,
        token,
        dataSource: result.dataSource,
        isLive: result.isLive,
        isDemo: result.isDemo,
        collectedAt: result.collectedAt,
        summary: result.summary,
        transactions: result.transactions,
        stored: result.stored,
        skipped: result.skipped,
        providerError: result.providerError || undefined,
        provenance: result.provenance,
      },
    });
  } catch (error) { next(error); }
});

// ── GET /api/transactions/:hash — single transaction by hash ──────────────────
router.get('/:hash', authenticate, async (req, res, next) => {
  try {
    const { hash } = req.params;

    // Demo mode: search demo store
    if (!isDatabaseConnected()) {
      const tx = demoStore.getTransactions().find(t => t.transactionHash === hash);
      if (tx) {
        return res.json({
          success: true,
          data: { transaction: { ...tx, isDemo: true }, demoMode: true },
        });
      }
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found.' },
      });
    }

    const tx = await Transaction.findOne({ transactionHash: hash }).lean();
    if (!tx) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found.' },
      });
    }
    res.json({ success: true, data: { transaction: tx } });
  } catch (error) { next(error); }
});

export default router;
