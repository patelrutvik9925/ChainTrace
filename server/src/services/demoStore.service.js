/**
 * In-Memory Demo Store
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a complete, pre-built investigation dataset in memory when MongoDB
 * is unavailable (DEMO_MODE=true, no DB connection).
 *
 * ⚠ This data is clearly marked DEMO throughout the API responses.
 *    It is NEVER presented as live blockchain data.
 *
 * Architecture: The store is a singleton module-level object.
 * Routes check isDatabaseConnected() first; if DB is down they call these
 * helpers instead of Mongoose. When DB becomes available, normal DB paths
 * are used and this store is ignored.
 */

import { DEMO_TRANSACTIONS, DEMO_FINDINGS, DEMO_GRAPH_NODES, getDemoCase } from './demo.service.js';

// ── Stable demo IDs ────────────────────────────────────────────────────────────
export const DEMO_IDS = {
  caseId:         'demo-case-0001',
  caseMongoId:    'demo-case-mongo-0001',
  investigationId:'demo-inv-mongo-0001',
  userId:         'demo-admin-0001',
};

// ── Pre-built demo case ────────────────────────────────────────────────────────
function buildDemoCase(userId = DEMO_IDS.userId) {
  const base = getDemoCase(userId);
  return {
    _id: DEMO_IDS.caseMongoId,
    caseId: 'SIH-2026-DEMO1',
    ...base,
    createdBy: { _id: userId, username: 'admin', fullName: 'System Administrator' },
    assignedTo: { _id: userId, username: 'admin', fullName: 'System Administrator' },
    wallets: [],
    investigations: [DEMO_IDS.investigationId],
    reports: [],
    tags: ['DEMO', 'TRC-20', 'USDT', 'FRAUD'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Pre-built demo investigation ───────────────────────────────────────────────
function buildDemoInvestigation() {
  return {
    _id: DEMO_IDS.investigationId,
    case: DEMO_IDS.caseMongoId,
    startedBy: { _id: DEMO_IDS.userId, username: 'admin', fullName: 'System Administrator' },
    status: 'COMPLETE',
    rootWallet: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    blockchain: 'TRON',
    token: 'USDT',
    tracingDepth: 4,
    tracingDirection: 'FORWARD',
    progress: {
      currentStep: 'COMPLETE',
      stepsCompleted: ['COLLECTING', 'TRACING', 'ANALYZING', 'PATTERN_DETECTION', 'VASP_ATTRIBUTION'],
      walletsCollected: DEMO_GRAPH_NODES.length,
      transactionsCollected: DEMO_TRANSACTIONS.length,
      hopsTraced: 4,
      patternsDetected: DEMO_FINDINGS.length,
    },
    summary: {
      totalWallets: DEMO_GRAPH_NODES.length,
      totalTransactions: DEMO_TRANSACTIONS.length,
      suspiciousWallets: 3,
      possibleVasps: 1,
      patternsFound: DEMO_FINDINGS.length,
      riskLevel: 'HIGH',
      riskIndicators: ['RAPID_MOVEMENT', 'FUND_SPLITTING', 'MULTI_HOP_LAYERING', 'POSSIBLE_VASP_DEPOSIT'],
    },
    findings: DEMO_FINDINGS.map((f, i) => ({ _id: `demo-finding-${i}`, ...f })),
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
    createdAt: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Pre-built demo wallets ─────────────────────────────────────────────────────
function buildDemoWallets() {
  return DEMO_GRAPH_NODES.map((n, i) => ({
    _id: `demo-wallet-${i}`,
    address: n.id,
    blockchain: 'TRON',
    token: 'USDT',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    classification: n.type,
    riskLevel: n.riskLevel,
    riskScore: n.type === 'REPORTED_SUSPECT' ? 90 : n.type === 'VASP_DEPOSIT' ? 55 : 75,
    stats: {
      transactionCount: n.txCount,
      totalReceived: n.balance,
      totalSent: n.type === 'VASP_DEPOSIT' ? '0' : n.balance,
    },
    vaspAttribution: n.vaspName ? {
      vaspName: n.vaspName,
      attributionType: 'INDIRECT',
      confidence: n.confidence,
      evidence: ['Transaction velocity', 'Multiple counterparties'],
      attributedAt: new Date().toISOString(),
    } : undefined,
    case: DEMO_IDS.caseMongoId,
    addedBy: DEMO_IDS.userId,
    isOriginalReported: n.isOriginal || false,
    hopDepth: i,
    isMonitored: i === 0,
    monitoringSince: i === 0 ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    isDemo: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

// ── Pre-built demo transactions ────────────────────────────────────────────────
function buildDemoTransactions() {
  return DEMO_TRANSACTIONS.map((tx, i) => ({
    _id: `demo-tx-${i}`,
    ...tx,
    provenance: {
      provider: 'DEMO',
      blockchain: 'TRON',
      retrievedAt: new Date().toISOString(),
      requestType: 'DEMO_DATA',
      sourceStatus: 'DEMO',
    },
    case: DEMO_IDS.caseMongoId,
    investigation: DEMO_IDS.investigationId,
    isDemo: true,
    createdAt: tx.timestamp,
    updatedAt: new Date().toISOString(),
  }));
}

// ── Pre-built demo findings ────────────────────────────────────────────────────
function buildDemoFindings() {
  return DEMO_FINDINGS.map((f, i) => ({
    _id: `demo-finding-${i}`,
    ...f,
    case: DEMO_IDS.caseMongoId,
    investigation: DEMO_IDS.investigationId,
    isDemo: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

// ── Pre-built demo alerts ──────────────────────────────────────────────────────
function buildDemoAlerts() {
  return [
    {
      _id: 'demo-alert-001',
      case: DEMO_IDS.caseMongoId,
      wallet: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
      blockchain: 'TRON',
      transactionHash: DEMO_TRANSACTIONS[0]?.transactionHash,
      alertType: 'RAPID_MOVEMENT',
      severity: 'HIGH',
      title: 'Rapid Fund Movement Detected',
      message: 'Funds moved through 3 wallets within 14 hours of the initial transaction.',
      status: 'UNREAD',
      context: {
        caseId: 'SIH-2026-DEMO1',
        walletAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        investigationId: DEMO_IDS.investigationId,
      },
      isDemo: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'demo-alert-002',
      case: DEMO_IDS.caseMongoId,
      wallet: 'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF',
      blockchain: 'TRON',
      alertType: 'POSSIBLE_VASP',
      severity: 'MEDIUM',
      title: 'Possible VASP Deposit Address Identified',
      message: 'Terminal wallet exhibits behavioral patterns consistent with a VASP deposit address.',
      status: 'UNREAD',
      context: {
        caseId: 'SIH-2026-DEMO1',
        walletAddress: 'TKVEtA6opBchJiURQBmRTKFGRotC57ytmF',
        investigationId: DEMO_IDS.investigationId,
      },
      isDemo: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// ── Pre-built demo graph data ──────────────────────────────────────────────────
export function buildDemoGraphData() {
  const wallets = buildDemoWallets();
  const transactions = buildDemoTransactions();

  const nodes = wallets.map(w => ({
    data: {
      id: w.address,
      label: w.address.substring(0, 8) + '...',
      fullAddress: w.address,
      type: w.classification,
      riskLevel: w.riskLevel,
      riskScore: w.riskScore,
      chain: w.blockchain,
      token: w.token,
      txCount: w.stats?.transactionCount || 0,
      totalReceived: w.stats?.totalReceived || '0',
      totalSent: w.stats?.totalSent || '0',
      vaspName: w.vaspAttribution?.vaspName,
      vaspConfidence: w.vaspAttribution?.confidence,
      isOriginal: w.isOriginalReported,
      hopDepth: w.hopDepth,
      isDemo: true,
    },
  }));

  const edges = transactions.map((tx, i) => ({
    data: {
      id: `edge-${tx.transactionHash || i}`,
      source: tx.from,
      target: tx.to,
      transactionHash: tx.transactionHash,
      amount: tx.amount,
      amountLabel: tx.amount ? `${parseFloat(tx.amount).toLocaleString()} ${tx.token || 'USDT'}` : '',
      token: tx.token,
      timestamp: tx.timestamp,
      status: tx.transactionStatus,
      isDemo: true,
    },
  }));

  return { nodes, edges, isDemo: true, investigationId: DEMO_IDS.investigationId };
}

// ── Pre-built demo report ──────────────────────────────────────────────────────
export function buildDemoReport(generatedBy = 'admin') {
  const demoCase = buildDemoCase();
  const inv = buildDemoInvestigation();
  const findings = buildDemoFindings();
  const wallets = buildDemoWallets();
  const transactions = buildDemoTransactions();

  return {
    generatedAt: new Date().toISOString(),
    generatedBy,
    isDemo: true,
    caseInformation: {
      caseId: demoCase.caseId,
      caseName: demoCase.caseName,
      status: demoCase.status,
      priority: demoCase.priority,
      createdBy: demoCase.createdBy?.fullName,
      assignedTo: demoCase.assignedTo?.fullName,
      createdAt: demoCase.createdAt,
    },
    input: {
      reportedWallet: demoCase.victimInfo?.reportedWallet,
      blockchain: demoCase.victimInfo?.blockchain,
      asset: demoCase.victimInfo?.asset,
      reportDate: demoCase.victimInfo?.reportDate,
      ncrbReference: demoCase.victimInfo?.ncrbComplaintNumber,
      estimatedLoss: demoCase.victimInfo?.estimatedLoss,
    },
    investigationSummary: {
      status: inv.status,
      walletsAnalyzed: inv.summary.totalWallets,
      transactionsAnalyzed: inv.summary.totalTransactions,
      hopsTraced: inv.progress.hopsTraced,
      riskLevel: inv.summary.riskLevel,
      riskIndicators: inv.summary.riskIndicators,
      possibleVasps: inv.summary.possibleVasps,
      patternsFound: inv.summary.patternsFound,
    },
    walletAnalysis: wallets.map(w => ({
      address: w.address,
      classification: w.classification,
      riskLevel: w.riskLevel,
      hopDepth: w.hopDepth,
      transactionCount: w.stats?.transactionCount,
      vaspAttribution: w.vaspAttribution?.vaspName ? {
        vasp: w.vaspAttribution.vaspName,
        type: w.vaspAttribution.attributionType,
        confidence: w.vaspAttribution.confidence,
      } : null,
    })),
    transactionTimeline: transactions.map(tx => ({
      hash: tx.transactionHash,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      token: tx.token,
      timestamp: tx.timestamp,
      status: tx.transactionStatus,
      dataSource: 'DEMO',
    })),
    findings: findings.map(f => ({
      type: f.findingType,
      severity: f.severity,
      title: f.title,
      explanation: f.explanation,
      confidence: f.confidence,
      evidence: f.evidence,
    })),
    recommendations: [
      'Review possible VASP destination wallet TKVEtA6... and initiate LEA coordination for account information.',
      'Preserve all transaction evidence with timestamps and data provenance.',
      'Continue monitoring the reported wallet for new incoming transactions.',
      'Inspect intermediary wallets TLyqzVG... and TXmVpin... for additional counterparty intelligence.',
      'Review cross-chain movement indicators at the VASP destination.',
    ],
    limitations: [
      'This report is an analytical assessment based on blockchain transaction patterns.',
      'VASP attribution is based on behavioral analysis and must be verified through official LEA coordination.',
      'Blockchain analytics cannot definitively identify individuals.',
      '⚠️ THIS IS A DEMONSTRATION REPORT — NOT BASED ON LIVE BLOCKCHAIN DATA.',
    ],
    disclaimer: 'This report is produced for investigative intelligence purposes only. It does not constitute legal evidence without proper verification and chain-of-custody procedures.',
  };
}

// ── Public accessors ───────────────────────────────────────────────────────────
export const demoStore = {
  getCase:          (userId) => buildDemoCase(userId),
  getCases:         (userId) => [buildDemoCase(userId)],
  getInvestigation: ()       => buildDemoInvestigation(),
  getInvestigations:()       => [buildDemoInvestigation()],
  getWallets:       ()       => buildDemoWallets(),
  getTransactions:  ()       => buildDemoTransactions(),
  getFindings:      ()       => buildDemoFindings(),
  getAlerts:        ()       => buildDemoAlerts(),
  getGraphData:     ()       => buildDemoGraphData(),
  getReport:        (by)     => buildDemoReport(by),
  getStats:         ()       => ({
    cases: 1, investigations: 1, unreadAlerts: 2, wallets: DEMO_GRAPH_NODES.length, demoMode: true,
  }),
};
