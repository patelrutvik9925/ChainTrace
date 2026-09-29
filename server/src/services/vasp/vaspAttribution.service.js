/**
 * VASP Attribution Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Identifies possible Virtual Asset Service Providers from transaction patterns.
 *
 * Attribution signals (in decreasing reliability order):
 *   A. Known address match (direct attribution)
 *   B. Deposit behavior (multiple incoming, sweep/consolidation)
 *   C. Multiple unrelated counterparties
 *   D. High transaction velocity
 *   E. Consolidation + sweep pattern
 *
 * IMPORTANT:
 *   - All attributions are analytical, not confirmed identifications.
 *   - DIRECT attribution requires a known-address match.
 *   - INDIRECT attribution is based on behavioral patterns only.
 *   - Never claim certainty without verified intelligence.
 */

import logger from '../../config/logger.js';

// ── Demo/prototype VASP intelligence (small controlled dataset) ────────────────
// In production, this would be populated from the VaspIntelligence MongoDB collection.
const PROTOTYPE_VASP_INTEL = [
  {
    vaspName: 'DemoExchange Platform',
    blockchain: 'TRON',
    addresses: ['TKVEtA6opBchJiURQBmRTKFGRotC57ytmF'],
    confidence: 'MEDIUM',
    source: 'DEMO_INTEL',
    isDemo: true,
    notes: 'DEMO: Analytical attribution. Not a real exchange identification.',
  },
];

// ── VASP Attribution Signals ───────────────────────────────────────────────────
const SIGNALS = {
  KNOWN_ADDRESS_MATCH:       { weight: 50, label: 'Known address match from VASP intelligence' },
  HIGH_COUNTERPARTY_COUNT:   { weight: 20, label: 'High number of distinct counterparties' },
  CONSOLIDATION_SWEEP:       { weight: 15, label: 'Consolidation/sweep behavior detected' },
  HIGH_VELOCITY:             { weight: 10, label: 'High transaction velocity' },
  DEPOSIT_PATTERN:           { weight: 15, label: 'Deposit address behavioral pattern' },
};

/**
 * Run VASP attribution analysis on a set of wallets.
 * @param {WalletNode[]} wallets    - traced wallet nodes
 * @param {Transaction[]} transactions - all transactions in trace
 * @returns {VaspAttribution[]}
 */
export function attributeVasps(wallets, transactions) {
  const attributions = [];

  for (const wallet of wallets) {
    const address = wallet.address || wallet.id;
    const result = analyzeWallet(address, wallets, transactions);
    if (result) attributions.push(result);
  }

  logger.info(`[VaspEngine] ${attributions.length} possible VASP attributions`);
  return attributions;
}

function analyzeWallet(address, wallets, transactions) {
  const signals = [];
  let totalWeight = 0;

  // Signal A: Known address match
  const knownVasp = PROTOTYPE_VASP_INTEL.find(v =>
    v.blockchain === 'TRON' && v.addresses.includes(address)
  );
  if (knownVasp) {
    signals.push(SIGNALS.KNOWN_ADDRESS_MATCH.label);
    totalWeight += SIGNALS.KNOWN_ADDRESS_MATCH.weight;
  }

  // Signal B: High counterparty count
  const allTx = transactions.filter(t => t.from === address || t.to === address);
  const incomingAddresses = new Set(transactions.filter(t => t.to === address).map(t => t.from));
  const outgoingAddresses = new Set(transactions.filter(t => t.from === address).map(t => t.to));
  if (incomingAddresses.size >= 5) {
    signals.push(SIGNALS.HIGH_COUNTERPARTY_COUNT.label);
    totalWeight += SIGNALS.HIGH_COUNTERPARTY_COUNT.weight;
  }

  // Signal C: Consolidation/sweep
  const totalIn  = transactions.filter(t => t.to === address).reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const totalOut = transactions.filter(t => t.from === address).reduce((s,t) => s + parseFloat(t.amount||0), 0);
  if (totalIn > 0 && totalOut / totalIn < 0.1 && incomingAddresses.size >= 3) {
    signals.push(SIGNALS.CONSOLIDATION_SWEEP.label);
    totalWeight += SIGNALS.CONSOLIDATION_SWEEP.weight;
  }

  // Signal D: High velocity
  if (allTx.length >= 50) {
    signals.push(SIGNALS.HIGH_VELOCITY.label);
    totalWeight += SIGNALS.HIGH_VELOCITY.weight;
  }

  // Signal E: Deposit pattern (many incoming, minimal outgoing)
  if (incomingAddresses.size >= 3 && outgoingAddresses.size <= 2) {
    signals.push(SIGNALS.DEPOSIT_PATTERN.label);
    totalWeight += SIGNALS.DEPOSIT_PATTERN.weight;
  }

  // Only report if we have at least 2 signals
  if (signals.length < 1 || totalWeight < 20) return null;

  const attributionType = knownVasp ? 'DIRECT' : 'INDIRECT';
  const confidence = totalWeight >= 60 ? 'HIGH' : totalWeight >= 35 ? 'MEDIUM' : 'LOW';
  const vaspName = knownVasp?.vaspName || 'Unidentified Possible VASP';

  return {
    address,
    vaspName,
    attributionType,
    confidence,
    confidenceScore: Math.min(totalWeight, 100),
    signals,
    isKnownMatch: !!knownVasp,
    isDemo: knownVasp?.isDemo || false,
    notes: knownVasp?.notes || 'Attribution based on behavioral analysis. Verify through official LEA coordination.',
    finding: {
      findingType: 'VASP_ATTRIBUTION',
      severity: confidence === 'HIGH' ? 'HIGH' : 'MEDIUM',
      title: `Possible VASP: ${vaspName} (${attributionType} Attribution)`,
      explanation: attributionType === 'DIRECT'
        ? `Wallet ${address.substring(0, 12)}... matched against VASP intelligence database as a possible ${vaspName} address. Attribution confidence: ${confidence}.`
        : `Wallet ${address.substring(0, 12)}... exhibits behavioral patterns consistent with a VASP deposit address. Attribution is INDIRECT — based on transaction patterns, not confirmed identification.`,
      evidence: {
        observations: signals,
        walletAddresses: [address],
        analysisRule: 'VASP_ATTRIBUTION_ENGINE_v1',
        limitations: `${attributionType === 'DIRECT' ? 'Address matched against prototype intelligence database.' : 'Attribution is behavioral only.'} This is an analytical finding and requires verification through official LEA/VASP coordination before use in any enforcement action.`,
      },
      confidence: { level: confidence, score: Math.min(totalWeight, 100), basis: signals },
      relatedWallets: [address],
      relatedTransactions: [],
    },
  };
}

/**
 * Classify wallet type based on transaction patterns
 */
export function classifyWallet(address, transactions, existingClassification = 'UNKNOWN') {
  if (existingClassification !== 'UNKNOWN') return existingClassification;

  const allTx = transactions.filter(t => t.from === address || t.to === address);
  const incoming = transactions.filter(t => t.to === address);
  const outgoing = transactions.filter(t => t.from === address);
  const inSenders = new Set(incoming.map(t => t.from));
  const outRecipients = new Set(outgoing.map(t => t.to));

  if (incoming.length === 0 && outgoing.length > 0) return 'FRAUD_SOURCE';
  if (outRecipients.size >= 5 && incoming.length > 0) return 'VASP_DEPOSIT';
  if (inSenders.size >= 3 && outgoing.length > 0 && outgoing.length <= 2) return 'INTERMEDIARY';
  if (incoming.length > 0 && outgoing.length > 0 && inSenders.size === 1) return 'MULE';
  if (allTx.length > 100) return 'VASP_DEPOSIT';

  return 'INTERMEDIARY';
}
