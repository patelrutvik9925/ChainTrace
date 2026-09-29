/**
 * TRON / TRC-20 Transaction Collection Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the full data collection pipeline for a TRON wallet:
 *
 *   TronAdapter (raw API)
 *       ↓
 *   Normalize (common tx format)
 *       ↓
 *   Deduplicate
 *       ↓
 *   Persist to Transaction collection (if DB available)
 *       ↓
 *   Attach to Wallet stats
 *
 * ⚠ DEMO data is NEVER stored as live blockchain data.
 *   Every record carries a provenance object so investigators can verify
 *   exactly where the data came from.
 */

import { tronAdapter } from './tron.adapter.js';
import { isDatabaseConnected } from '../../config/database.js';
import { demoStore } from '../demoStore.service.js';
import Transaction from '../../models/transaction.model.js';
import Wallet from '../../models/wallet.model.js';
import logger from '../../config/logger.js';

// TRC-20 USDT contract — preserved for provenance
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

/**
 * Collect TRC-20 USDT transfers for a wallet and persist them.
 *
 * @param {string} address   - TRON wallet address
 * @param {string} caseId    - MongoDB case ID (for investigation linkage)
 * @param {string} [invId]   - MongoDB investigation ID (optional)
 * @param {object} [options] - { limit, minTimestamp, token }
 * @returns {CollectionResult}
 */
export async function collectTrc20Transactions(address, caseId, invId = null, options = {}) {
  const token = options.token || 'USDT';
  const limit = options.limit || 50;
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();
  const collectedAt = new Date();

  // ── Demo fast path ────────────────────────────────────────────────────────────
  if (isDemo && !dbUp) {
    const demoTxs = demoStore.getTransactions().filter(
      t => (t.from === address || t.to === address) && (!token || t.token === token)
    );
    logger.info(`[TRC20Collect] Demo mode: ${demoTxs.length} transactions for ${address}`);
    return buildCollectionResult(demoTxs, address, 'DEMO', collectedAt, { isLive: false, isDemo: true });
  }

  // ── Live collection path ──────────────────────────────────────────────────────
  let rawTransfers = [];
  let dataSource = 'UNKNOWN';
  let providerError = null;

  try {
    rawTransfers = await tronAdapter.getTokenTransfers(address, token, { limit, minTimestamp: options.minTimestamp });
    dataSource = rawTransfers.length > 0 && rawTransfers[0]?.provenance?.sourceStatus === 'LIVE'
      ? 'TRONGRID_LIVE'
      : 'TRONGRID_DEMO_FALLBACK';
    logger.info(`[TRC20Collect] ${address}: fetched ${rawTransfers.length} transfers (${dataSource})`);
  } catch (err) {
    providerError = { code: err.code || 'PROVIDER_ERROR', message: err.message };
    logger.error(`[TRC20Collect] Provider error for ${address}: ${err.message}`);

    // Controlled fallback — return demo data clearly labelled
    if (process.env.DEMO_MODE === 'true') {
      const demoTxs = demoStore.getTransactions().filter(t => t.from === address || t.to === address);
      return buildCollectionResult(demoTxs, address, 'DEMO_FALLBACK', collectedAt, {
        isLive: false, isDemo: true, providerError,
      });
    }
    return { success: false, address, providerError, transactions: [], stored: 0, dataSource: 'UNAVAILABLE' };
  }

  // ── Persist to DB if available ────────────────────────────────────────────────
  let stored = 0;
  let skipped = 0;
  if (dbUp && rawTransfers.length > 0) {
    const { stored: s, skipped: sk } = await persistTransactions(rawTransfers, caseId, invId);
    stored = s;
    skipped = sk;
    // Update wallet stats
    await updateWalletStats(address, caseId, rawTransfers, collectedAt, dataSource);
  }

  const isLive = dataSource === 'TRONGRID_LIVE';
  return buildCollectionResult(rawTransfers, address, dataSource, collectedAt, {
    isLive, isDemo: false, stored, skipped, providerError,
  });
}

/**
 * Fetch wallet profile from TronGrid (balance, TRC-20 balances, tx count).
 * Falls back to DB record or demo data if provider unavailable.
 */
export async function collectWalletProfile(address, caseId) {
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();

  if (isDemo && !dbUp) {
    const w = demoStore.getWallets().find(w => w.address === address);
    return { address, isLive: false, isDemo: true, ...w?.stats };
  }

  const profile = await tronAdapter.getWalletProfile(address);
  const isLive = profile.dataSource === 'TRONGRID';

  if (dbUp && isLive && caseId) {
    await Wallet.findOneAndUpdate(
      { address, case: caseId },
      {
        $set: {
          'stats.trxBalance': profile.trxBalance || '0',
          'dataProvenance.provider': 'TRONGRID',
          'dataProvenance.retrievedAt': new Date(),
        },
      }
    );
  }

  return { ...profile, address, isLive };
}

/**
 * Retrieve stored transactions for a wallet/case from DB.
 * Falls back to demo store if DB unavailable.
 */
export async function getStoredTransactions(query = {}) {
  const { address, caseId, chain = 'TRON', token, page = 1, limit = 50 } = query;
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();

  if (isDemo && !dbUp) {
    let txs = demoStore.getTransactions();
    if (address) txs = txs.filter(t => t.from === address || t.to === address);
    if (token)   txs = txs.filter(t => t.token === token);
    return { transactions: txs, total: txs.length, isDemo: true, dataSource: 'DEMO' };
  }

  const filter = { chain };
  if (caseId) filter.case = caseId;
  if (token)  filter.token = token;
  if (address) filter.$or = [{ from: address }, { to: address }];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Transaction.countDocuments(filter),
  ]);
  return { transactions, total, isDemo: false, dataSource: 'DATABASE' };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Persist normalized transactions to MongoDB; dedup by (chain + transactionHash). */
async function persistTransactions(transactions, caseId, invId) {
  let stored = 0;
  let skipped = 0;
  for (const tx of transactions) {
    try {
      const exists = await Transaction.findOne({
        chain: tx.chain,
        transactionHash: tx.transactionHash,
      }).lean();
      if (exists) { skipped++; continue; }

      await Transaction.create({
        ...tx,
        case: caseId || undefined,
        investigation: invId || undefined,
        isDemo: false,
      });
      stored++;
    } catch (err) {
      if (err.code === 11000) { skipped++; } // duplicate key — expected
      else logger.error(`[TRC20Collect] DB persist error: ${err.message}`);
    }
  }
  logger.info(`[TRC20Collect] Persisted ${stored} new, skipped ${skipped} duplicate transactions`);
  return { stored, skipped };
}

/** Update Wallet stats document after collection. */
async function updateWalletStats(address, caseId, transactions, collectedAt, dataSource) {
  try {
    const incoming = transactions.filter(t => t.to === address);
    const outgoing = transactions.filter(t => t.from === address);
    const totalReceived = incoming.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const totalSent     = outgoing.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const sortedByTime  = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    await Wallet.findOneAndUpdate(
      { address, case: caseId },
      {
        $set: {
          'stats.transactionCount': transactions.length,
          'stats.totalReceived': String(totalReceived),
          'stats.totalSent': String(totalSent),
          'stats.firstSeen': sortedByTime[0]?.timestamp || null,
          'stats.lastSeen': sortedByTime[sortedByTime.length - 1]?.timestamp || null,
          'dataProvenance.provider': dataSource,
          'dataProvenance.retrievedAt': collectedAt,
        },
      }
    );
  } catch (err) {
    logger.warn(`[TRC20Collect] updateWalletStats error: ${err.message}`);
  }
}

/** Build a structured CollectionResult. */
function buildCollectionResult(transactions, address, dataSource, collectedAt, meta = {}) {
  const incoming = transactions.filter(t => t.to === address);
  const outgoing = transactions.filter(t => t.from === address);
  const totalReceived = incoming.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalSent     = outgoing.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const sortedByTime  = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    success: true,
    address,
    dataSource,
    collectedAt,
    isLive: meta.isLive || false,
    isDemo: meta.isDemo || false,
    transactions,
    summary: {
      total: transactions.length,
      incoming: incoming.length,
      outgoing: outgoing.length,
      totalReceived: String(totalReceived),
      totalSent: String(totalSent),
      firstTransaction: sortedByTime[0]?.timestamp || null,
      lastTransaction: sortedByTime[sortedByTime.length - 1]?.timestamp || null,
      token: 'USDT',
      contractAddress: USDT_CONTRACT,
    },
    stored: meta.stored || 0,
    skipped: meta.skipped || 0,
    providerError: meta.providerError || null,
    provenance: {
      provider: dataSource,
      blockchain: 'TRON',
      retrievedAt: collectedAt,
      requestType: 'TRC20_USDT_TRANSFERS',
      sourceStatus: meta.isLive ? 'LIVE' : meta.isDemo ? 'DEMO' : 'FALLBACK',
    },
  };
}
