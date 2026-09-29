/**
 * Wallet Validation & Collection Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates addresses and collects on-chain data via the blockchain adapters.
 *
 * Demo Mode behaviour:
 *   - Address validation: always works (pure regex, no network)
 *   - Data collection: returns demo data immediately (no network call)
 *   - Live mode: calls TronGrid/adapter, falls back to demo on failure
 */

import { getAdapter } from './blockchain/index.js';
import { isDatabaseConnected } from '../config/database.js';
import { demoStore } from './demoStore.service.js';
import Wallet from '../models/wallet.model.js';
import logger from '../config/logger.js';

// ── Known demo addresses for fast lookup ───────────────────────────────────────
const DEMO_ADDRESSES = new Set([
  'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
  'TXmVpin5vres52mD9e1Z3os33wuCPA6Qme',
  'TVDmEqBY6DRt7gBw4tELQFbKSe7nkH5m9P',
  'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF',
]);

// ── Address validation ─────────────────────────────────────────────────────────
export async function validateWalletAddress(address, chain = 'TRON') {
  try {
    const adapter = getAdapter(chain);
    const result = await adapter.validateAddress(address);
    return result;
  } catch (err) {
    return { valid: false, reason: `Unsupported chain: ${chain}` };
  }
}

// ── Validate + check duplicate ─────────────────────────────────────────────────
export async function validateAndCheckDuplicate(address, chain, caseId) {
  const validation = await validateWalletAddress(address, chain);
  if (!validation.valid) return { ...validation, isDuplicate: false };

  // Only check DB for duplicates when connected
  if (isDatabaseConnected() && caseId) {
    const existing = await Wallet.findOne({ address, case: caseId });
    if (existing) {
      return { valid: true, address, chain, isDuplicate: true, existingWallet: existing };
    }
  }

  // In demo mode, check against demo wallets
  if (!isDatabaseConnected() && DEMO_ADDRESSES.has(address)) {
    const demoWallet = demoStore.getWallets().find(w => w.address === address);
    if (demoWallet) {
      return { valid: true, address, chain, isDuplicate: true, existingWallet: demoWallet, demoMode: true };
    }
  }

  return { valid: true, address, chain, isDuplicate: false };
}

// ── Collect blockchain data for a wallet ──────────────────────────────────────
export async function collectWalletData(address, chain = 'TRON', token = 'USDT', options = {}) {
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();

  // Demo fast path: if DB is down or this is a known demo address, skip network
  if ((isDemo && !dbUp) || DEMO_ADDRESSES.has(address)) {
    return buildDemoWalletData(address, chain, token);
  }

  // Live path: call blockchain adapter
  const adapter = getAdapter(chain);
  const [transfersResult, profileResult] = await Promise.allSettled([
    adapter.getTokenTransfers(address, token, { limit: options.limit || 50 }),
    adapter.getWalletProfile(address),
  ]);

  const transfers = transfersResult.status === 'fulfilled' ? transfersResult.value : [];
  const profile = profileResult.status === 'fulfilled'
    ? profileResult.value
    : { balance: '0', txCount: 0, dataSource: 'UNAVAILABLE' };

  const isLive = transfers.length > 0 && transfers[0]?.provenance?.sourceStatus === 'LIVE';

  if (!isLive) {
    logger.warn(`[WalletCollect] ${address}: No live data from provider — using demo fallback`);
    return buildDemoWalletData(address, chain, token);
  }

  logger.info(`[WalletCollect] ${address} (${chain}): ${transfers.length} live transfers`);
  return {
    address, chain, token, transfers, profile,
    isLive: true, dataSource: 'TRONGRID_LIVE', collectedAt: new Date(),
  };
}

/** Build a demo wallet data response — no network calls */
function buildDemoWalletData(address, chain, token) {
  const demoWallets = demoStore.getWallets();
  const demoTxs = demoStore.getTransactions();
  const matchedWallet = demoWallets.find(w => w.address === address);

  const relevantTxs = demoTxs.filter(t => t.from === address || t.to === address);
  const totalReceived = relevantTxs
    .filter(t => t.to === address)
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalSent = relevantTxs
    .filter(t => t.from === address)
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  return {
    address, chain, token,
    transfers: relevantTxs,
    profile: {
      balance: matchedWallet?.stats?.totalReceived || '0',
      txCount: matchedWallet?.stats?.transactionCount || relevantTxs.length,
      totalReceived: String(totalReceived),
      totalSent: String(totalSent),
      firstSeen: relevantTxs[0]?.timestamp || null,
      lastSeen: relevantTxs[relevantTxs.length - 1]?.timestamp || null,
      dataSource: 'DEMO',
    },
    isLive: false,
    dataSource: 'DEMO',
    collectedAt: new Date(),
  };
}

// ── Build wallet profile for display ──────────────────────────────────────────
export async function getWalletProfile(address, chain = 'TRON') {
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();

  // Demo mode: return from store
  if ((isDemo && !dbUp) || DEMO_ADDRESSES.has(address)) {
    const w = demoStore.getWallets().find(w => w.address === address);
    const txs = demoStore.getTransactions().filter(t => t.from === address || t.to === address);
    return {
      address, chain,
      classification: w?.classification || 'UNKNOWN',
      riskLevel: w?.riskLevel || 'MEDIUM',
      stats: w?.stats || { transactionCount: txs.length },
      vaspAttribution: w?.vaspAttribution,
      transactions: txs,
      isDemo: true,
    };
  }

  // Live mode: try DB first
  if (dbUp) {
    const dbWallet = await Wallet.findOne({ address }).lean();
    if (dbWallet) return { ...dbWallet, isDemo: false };
  }

  // Fallback to adapter
  const adapter = getAdapter(chain);
  const profile = await adapter.getWalletProfile(address).catch(() => ({}));
  return { address, chain, profile, isDemo: false };
}

// ── Update wallet stats in DB ──────────────────────────────────────────────────
export async function updateWalletStats(walletId, transfers, profile) {
  if (!isDatabaseConnected()) return;
  try {
    const totalReceived = transfers
      .filter(t => t.to === walletId)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalSent = transfers
      .filter(t => t.from === walletId)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    await Wallet.findByIdAndUpdate(walletId, {
      'stats.transactionCount': transfers.length,
      'stats.totalReceived': String(totalReceived),
      'stats.totalSent': String(totalSent),
      'dataProvenance.retrievedAt': new Date(),
      'dataProvenance.provider': transfers[0]?.provenance?.provider || 'UNKNOWN',
    });
  } catch (err) {
    logger.error('updateWalletStats error:', err.message);
  }
}
