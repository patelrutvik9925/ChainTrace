/**
 * Suspicious Pattern Detection Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic rule-based analysis of transaction graphs.
 * Each detector returns findings with severity, confidence, and evidence.
 *
 * AI/ML enhancement is architecture-compatible but not required.
 * All findings include supporting observations and limitations.
 */

import logger from '../../config/logger.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const RAPID_MOVEMENT_HOURS = 24;     // funds moved through multiple hops within this window
const LARGE_TRANSFER_USD  = 10000;   // threshold for "large transfer"
const HIGH_VELOCITY_COUNT = 10;      // tx count in a short window = high velocity
const SPLITTING_RATIO_MIN = 0.3;     // min portion of received amount forwarded to trigger split detection
const SPLITTING_RATIO_MAX = 0.7;     // max (e.g. 40/60 or 50/50 split)

/**
 * Run all pattern detectors on a trace result.
 * @param {TraceResult} traceResult - output from tracer.service.js
 * @returns {Finding[]}
 */
export function detectPatterns(traceResult) {
  const { wallets = [], transactions = [], rootAddress } = traceResult;
  const findings = [];

  try {
    findings.push(...detectRapidMovement(wallets, transactions, rootAddress));
    findings.push(...detectFundSplitting(wallets, transactions));
    findings.push(...detectConsolidation(wallets, transactions));
    findings.push(...detectMultiHopLayering(wallets, transactions));
    findings.push(...detectHighVelocity(wallets, transactions));
    findings.push(...detectPeelChain(wallets, transactions));
  } catch (err) {
    logger.error('[PatternEngine] Error during analysis:', err.message);
  }

  logger.info(`[PatternEngine] Detected ${findings.length} patterns`);
  return findings;
}

// ── Detector: Rapid Movement ───────────────────────────────────────────────────
function detectRapidMovement(wallets, transactions, rootAddress) {
  if (transactions.length < 2) return [];

  const sorted = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const hoursSpan = (new Date(last.timestamp) - new Date(first.timestamp)) / (1000 * 60 * 60);
  const hops = wallets.length;

  if (hops >= 3 && hoursSpan <= RAPID_MOVEMENT_HOURS) {
    return [{
      findingType: 'RAPID_MOVEMENT',
      severity: 'HIGH',
      title: 'Rapid Fund Movement Detected',
      explanation: `Funds traversed ${hops} wallets within ${hoursSpan.toFixed(1)} hours. This is consistent with deliberate rapid layering to obscure transaction origin.`,
      evidence: {
        observations: [
          `${hops} wallets involved in fund movement`,
          `Total time window: ${hoursSpan.toFixed(1)} hours`,
          `First transaction: ${new Date(first.timestamp).toISOString()}`,
          `Last transaction: ${new Date(last.timestamp).toISOString()}`,
        ],
        transactionHashes: sorted.slice(0, 3).map(t => t.transactionHash).filter(Boolean),
        walletAddresses: [rootAddress],
        dataSource: transactions[0]?.dataSource || 'UNKNOWN',
        analysisRule: 'RAPID_MOVEMENT_DETECTOR_v1',
        limitations: 'Rapid movement alone is not conclusive. Multiple factors should be considered.',
      },
      confidence: {
        level: hoursSpan <= 6 ? 'HIGH' : 'MEDIUM',
        score: hoursSpan <= 6 ? 85 : 65,
        basis: ['Time window', 'Number of hops', 'Transaction sequence'],
      },
      relatedWallets: wallets.map(w => w.address || w.id),
      relatedTransactions: sorted.slice(0, 3).map(t => t.transactionHash).filter(Boolean),
    }];
  }
  return [];
}

// ── Detector: Fund Splitting ───────────────────────────────────────────────────
function detectFundSplitting(wallets, transactions) {
  const findings = [];
  for (const wallet of wallets) {
    const addr = wallet.address || wallet.id;
    const incoming = transactions.filter(t => t.to === addr);
    const outgoing = transactions.filter(t => t.from === addr);
    if (incoming.length === 0 || outgoing.length < 2) continue;

    const totalIn = incoming.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const totalOut = outgoing.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const outRecipients = new Set(outgoing.map(t => t.to));

    if (outRecipients.size >= 2 && totalOut >= totalIn * SPLITTING_RATIO_MIN) {
      // Check if split amounts are roughly equal (structuring indicator)
      const amounts = outgoing.map(t => parseFloat(t.amount || 0));
      const maxAmt = Math.max(...amounts);
      const minAmt = Math.min(...amounts);
      const isEqualSplit = maxAmt > 0 && minAmt / maxAmt >= 0.7;

      findings.push({
        findingType: 'SPLITTING',
        severity: 'HIGH',
        title: `Fund Splitting Detected at ${addr.substring(0, 12)}...`,
        explanation: `Wallet received ${totalIn.toFixed(0)} USDT and split funds to ${outRecipients.size} separate wallets. ${isEqualSplit ? 'Amounts are approximately equal, suggesting structured splitting.' : ''}`,
        evidence: {
          observations: [
            `Total received: ${totalIn.toFixed(0)} USDT`,
            `Split to ${outRecipients.size} wallets`,
            `Total forwarded: ${totalOut.toFixed(0)} USDT`,
            isEqualSplit ? 'Near-equal split amounts (structuring indicator)' : 'Unequal split amounts',
          ],
          transactionHashes: outgoing.map(t => t.transactionHash).filter(Boolean),
          walletAddresses: [addr, ...Array.from(outRecipients)],
          dataSource: transactions[0]?.dataSource || 'UNKNOWN',
          analysisRule: 'SPLITTING_DETECTOR_v1',
        },
        confidence: {
          level: isEqualSplit ? 'HIGH' : 'MEDIUM',
          score: isEqualSplit ? 88 : 65,
          basis: ['Multiple outgoing transfers', 'Amount proportions', outRecipients.size >= 3 ? 'Many recipients' : 'Two recipients'],
        },
        relatedWallets: [addr, ...Array.from(outRecipients)],
        relatedTransactions: outgoing.map(t => t.transactionHash).filter(Boolean),
      });
    }
  }
  return findings;
}

// ── Detector: Consolidation ────────────────────────────────────────────────────
function detectConsolidation(wallets, transactions) {
  const findings = [];
  for (const wallet of wallets) {
    const addr = wallet.address || wallet.id;
    const incoming = transactions.filter(t => t.to === addr);
    const inSenders = new Set(incoming.map(t => t.from));
    if (inSenders.size >= 3) {
      findings.push({
        findingType: 'CONSOLIDATION',
        severity: 'MEDIUM',
        title: `Fund Consolidation at ${addr.substring(0, 12)}...`,
        explanation: `Wallet received funds from ${inSenders.size} distinct senders. Consolidation from multiple sources may indicate aggregation before forwarding.`,
        evidence: {
          observations: [
            `${inSenders.size} distinct incoming senders`,
            `${incoming.length} incoming transactions`,
            'Multiple counterparty consolidation pattern',
          ],
          transactionHashes: incoming.slice(0, 3).map(t => t.transactionHash).filter(Boolean),
          walletAddresses: [addr],
          dataSource: transactions[0]?.dataSource || 'UNKNOWN',
          analysisRule: 'CONSOLIDATION_DETECTOR_v1',
        },
        confidence: {
          level: inSenders.size >= 5 ? 'HIGH' : 'MEDIUM',
          score: Math.min(50 + inSenders.size * 5, 90),
          basis: [`${inSenders.size} distinct senders`],
        },
        relatedWallets: [addr],
        relatedTransactions: incoming.slice(0, 3).map(t => t.transactionHash).filter(Boolean),
      });
    }
  }
  return findings;
}

// ── Detector: Multi-hop Layering ───────────────────────────────────────────────
function detectMultiHopLayering(wallets, transactions) {
  const maxHop = Math.max(...wallets.map(w => w.hopDepth || 0));
  if (maxHop < 3) return [];
  const intermediaries = wallets.filter(w => {
    const addr = w.address || w.id;
    const hasIn  = transactions.some(t => t.to === addr);
    const hasOut = transactions.some(t => t.from === addr);
    return hasIn && hasOut && (w.hopDepth || 0) > 0;
  });
  if (intermediaries.length < 2) return [];
  return [{
    findingType: 'MULTI_HOP_LAYERING',
    severity: 'HIGH',
    title: `Multi-Hop Layering Pattern (${maxHop} hops)`,
    explanation: `Funds passed through ${intermediaries.length} intermediary wallets over ${maxHop} hops. This pattern is consistent with layering — a money-laundering technique to obscure transaction trail.`,
    evidence: {
      observations: [
        `${maxHop} total hops traced`,
        `${intermediaries.length} transit/intermediary wallets`,
        'Each wallet receives and forwards funds with minimal retention',
      ],
      transactionHashes: transactions.slice(0, 4).map(t => t.transactionHash).filter(Boolean),
      walletAddresses: intermediaries.map(w => w.address || w.id),
      dataSource: transactions[0]?.dataSource || 'UNKNOWN',
      analysisRule: 'LAYERING_DETECTOR_v1',
    },
    confidence: {
      level: maxHop >= 4 ? 'HIGH' : 'MEDIUM',
      score: Math.min(55 + maxHop * 10, 90),
      basis: [`${maxHop} hops`, `${intermediaries.length} intermediaries`],
    },
    relatedWallets: intermediaries.map(w => w.address || w.id),
    relatedTransactions: transactions.slice(0, 4).map(t => t.transactionHash).filter(Boolean),
  }];
}

// ── Detector: High Velocity ────────────────────────────────────────────────────
function detectHighVelocity(wallets, transactions) {
  const findings = [];
  for (const wallet of wallets) {
    const addr = wallet.address || wallet.id;
    const wTxs = transactions.filter(t => t.from === addr || t.to === addr);
    if (wTxs.length >= HIGH_VELOCITY_COUNT) {
      findings.push({
        findingType: 'HIGH_VELOCITY',
        severity: 'MEDIUM',
        title: `High Transaction Velocity at ${addr.substring(0, 12)}...`,
        explanation: `Wallet shows ${wTxs.length} transactions — high activity relative to investigation scope. High velocity is associated with exchange deposit addresses or active money movement.`,
        evidence: {
          observations: [`${wTxs.length} transactions observed for this wallet`],
          walletAddresses: [addr],
          dataSource: transactions[0]?.dataSource || 'UNKNOWN',
          analysisRule: 'VELOCITY_DETECTOR_v1',
        },
        confidence: { level: 'MEDIUM', score: 60, basis: ['Transaction count'] },
        relatedWallets: [addr],
        relatedTransactions: wTxs.slice(0, 3).map(t => t.transactionHash).filter(Boolean),
      });
    }
  }
  return findings;
}

// ── Detector: Peel Chain ──────────────────────────────────────────────────────
function detectPeelChain(wallets, transactions) {
  // Peel chain: each wallet sends almost all funds to a new wallet, keeping a small "peel"
  const sorted = [...wallets].sort((a, b) => (a.hopDepth || 0) - (b.hopDepth || 0));
  let peelCount = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const addr = sorted[i].address || sorted[i].id;
    const inc  = transactions.filter(t => t.to   === addr).reduce((s,t) => s + parseFloat(t.amount||0), 0);
    const out  = transactions.filter(t => t.from === addr).reduce((s,t) => s + parseFloat(t.amount||0), 0);
    if (inc > 0 && out > 0 && out / inc >= 0.85) peelCount++;
  }
  if (peelCount >= 2 && sorted.length >= 3) {
    return [{
      findingType: 'PEEL_CHAIN',
      severity: 'HIGH',
      title: 'Peel-Chain Pattern Detected',
      explanation: `${peelCount} wallets forwarded ≥85% of received funds to the next wallet, retaining a small "peel". This is a known obfuscation technique.`,
      evidence: {
        observations: [
          `${peelCount} wallets with peel-chain forwarding behaviour`,
          'Each wallet retains <15% of received funds',
        ],
        walletAddresses: sorted.slice(0, peelCount).map(w => w.address || w.id),
        dataSource: transactions[0]?.dataSource || 'UNKNOWN',
        analysisRule: 'PEEL_CHAIN_DETECTOR_v1',
      },
      confidence: { level: 'MEDIUM', score: 72, basis: ['Forwarding ratios', 'Sequential chain'] },
      relatedWallets: sorted.slice(0, peelCount).map(w => w.address || w.id),
      relatedTransactions: transactions.slice(0, 3).map(t => t.transactionHash).filter(Boolean),
    }];
  }
  return [];
}

// ── Risk Score Calculator ──────────────────────────────────────────────────────
export function calculateRiskLevel(findings) {
  if (!findings || findings.length === 0) return { level: 'LOW', score: 10, indicators: [] };
  const weights = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5, INFO: 2 };
  let score = 0;
  const indicators = [];
  for (const f of findings) {
    score += weights[f.severity] || 0;
    indicators.push(f.findingType);
  }
  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  return { level, score: Math.min(score, 100), indicators: [...new Set(indicators)] };
}
