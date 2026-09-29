/**
 * Fund Tracing Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Traces funds through connected wallets via blockchain transaction data.
 * Supports forward tracing (follow outgoing funds) for 1–5 hops.
 *
 * When DB is unavailable or DEMO_MODE=true, returns pre-built demo trace.
 * When live APIs are unavailable, falls back to demo data with clear labeling.
 *
 * Architecture supports:
 *   - TRON (primary, implemented)
 *   - Ethereum (architecture-ready)
 *   - Bitcoin (architecture-ready)
 */

import { getAdapter } from '../blockchain/index.js';
import { isDatabaseConnected } from '../../config/database.js';
import { demoStore } from '../demoStore.service.js';
import logger from '../../config/logger.js';

/**
 * Trace funds forward from a root wallet for up to `maxHops` hops.
 *
 * @param {string} rootAddress - Starting wallet address
 * @param {string} chain       - Blockchain (TRON|ETHEREUM|BITCOIN)
 * @param {string} token       - Token filter (USDT etc.)
 * @param {number} maxHops     - Maximum hops to trace (1–5)
 * @param {object} filters     - { minAmount, maxAmount, startTime, endTime }
 * @returns {TraceResult}
 */
export async function traceForward(rootAddress, chain = 'TRON', token = 'USDT', maxHops = 3, filters = {}) {
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();

  logger.info(`[Tracer] Starting forward trace: ${rootAddress} (${chain}, ${token}, ${maxHops} hops)`);

  // Demo mode fast path — return pre-built graph
  if (isDemo && !dbUp) {
    return buildDemoTrace(rootAddress, maxHops);
  }

  const adapter = getAdapter(chain);
  const validation = await adapter.validateAddress(rootAddress);
  if (!validation.valid) {
    throw new Error(`Invalid address: ${validation.reason}`);
  }

  const visited = new Set();        // addresses already processed
  const walletMap = new Map();      // address → wallet node
  const allTransactions = [];       // all normalized transactions discovered
  const queue = [{ address: rootAddress, hopDepth: 0 }];

  // Seed the root wallet
  walletMap.set(rootAddress, {
    address: rootAddress,
    hopDepth: 0,
    isOriginalReported: true,
    classification: 'REPORTED_SUSPECT',
    outgoing: [],
    incoming: [],
  });

  while (queue.length > 0) {
    const { address, hopDepth } = queue.shift();
    if (visited.has(address)) continue;
    visited.add(address);
    if (hopDepth >= maxHops) continue;

    logger.info(`[Tracer] Hop ${hopDepth}: ${address}`);

    let transfers = [];
    try {
      transfers = await adapter.getTokenTransfers(address, token, { limit: 50 });
      // Apply time filters
      if (filters.startTime) transfers = transfers.filter(t => new Date(t.timestamp) >= filters.startTime);
      if (filters.endTime)   transfers = transfers.filter(t => new Date(t.timestamp) <= filters.endTime);
      // Apply amount filters
      if (filters.minAmount) transfers = transfers.filter(t => parseFloat(t.amount || 0) >= filters.minAmount);
      if (filters.maxAmount) transfers = transfers.filter(t => parseFloat(t.amount || 0) <= filters.maxAmount);
    } catch (err) {
      logger.warn(`[Tracer] API error at hop ${hopDepth} for ${address}: ${err.message} — using demo fallback`);
      transfers = _demoFallbackForAddress(address);
    }

    for (const tx of transfers) {
      // Deduplicate by transaction hash
      if (!allTransactions.find(t => t.transactionHash === tx.transactionHash)) {
        allTransactions.push(tx);
      }

      // Track outgoing: follow funds forward
      if (tx.from === address && tx.to && !visited.has(tx.to)) {
        if (!walletMap.has(tx.to)) {
          walletMap.set(tx.to, {
            address: tx.to,
            hopDepth: hopDepth + 1,
            isOriginalReported: false,
            classification: 'UNKNOWN',
            outgoing: [],
            incoming: [],
          });
        }
        walletMap.get(address)?.outgoing.push(tx.to);
        walletMap.get(tx.to)?.incoming.push(address);
        queue.push({ address: tx.to, hopDepth: hopDepth + 1 });
      }
    }
  }

  const wallets = Array.from(walletMap.values());
  const isLive = allTransactions.length > 0 && allTransactions[0]?.provenance?.sourceStatus === 'LIVE';

  logger.info(`[Tracer] Trace complete: ${wallets.length} wallets, ${allTransactions.length} transactions`);

  return {
    rootAddress,
    chain,
    token,
    maxHops,
    wallets,
    transactions: allTransactions,
    isLive,
    isDemo: !isLive,
    dataSource: isLive ? 'TRONGRID_LIVE' : 'DEMO_FALLBACK',
    tracedAt: new Date(),
  };
}

/** Build a demo trace result from the demoStore */
function buildDemoTrace(rootAddress, maxHops) {
  const { nodes, edges } = demoStore.getGraphData();
  const wallets = nodes.map(n => ({
    address: n.data.fullAddress || n.data.id,
    hopDepth: n.data.hopDepth,
    isOriginalReported: n.data.isOriginal || false,
    classification: n.data.type,
    riskLevel: n.data.riskLevel,
  }));
  const transactions = demoStore.getTransactions().map(tx => ({
    ...tx, dataSource: 'DEMO',
  }));
  logger.info(`[Tracer] Demo trace: ${wallets.length} wallets, ${transactions.length} transactions`);
  return {
    rootAddress, chain: 'TRON', token: 'USDT', maxHops,
    wallets, transactions,
    isLive: false, isDemo: true,
    dataSource: 'DEMO', tracedAt: new Date(),
  };
}

/** Return demo transactions relevant to a given address */
function _demoFallbackForAddress(address) {
  const { transactions } = buildDemoTrace(address, 5);
  return transactions.filter(t => t.from === address || t.to === address);
}
