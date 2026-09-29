import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDatabase } from '../middleware/errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';
import Investigation from '../models/investigation.model.js';
import Transaction from '../models/transaction.model.js';
import Finding from '../models/finding.model.js';
import Wallet from '../models/wallet.model.js';
import Case from '../models/case.model.js';
import { createAuditLog } from '../services/audit.service.js';
import { demoStore, DEMO_IDS } from '../services/demoStore.service.js';
import { traceForward } from '../services/tracing/tracer.service.js';
import { detectPatterns, calculateRiskLevel } from '../services/patterns/patternEngine.service.js';
import { attributeVasps, classifyWallet } from '../services/vasp/vaspAttribution.service.js';

const router = express.Router();

// GET /api/investigations — list for case
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({ success: true, data: { investigations: demoStore.getInvestigations(), demoMode: true } });
    }
    const { caseId } = req.query;
    const filter = caseId ? { case: caseId } : {};
    const investigations = await Investigation.find(filter)
      .populate('startedBy', 'username fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { investigations } });
  } catch (error) { next(error); }
});

// GET /api/investigations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({ success: true, data: { investigation: demoStore.getInvestigation(), demoMode: true } });
    }
    const inv = await Investigation.findById(req.params.id)
      .populate('startedBy', 'username fullName')
      .populate('findings');
    if (!inv) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investigation not found.' } });
    res.json({ success: true, data: { investigation: inv } });
  } catch (error) { next(error); }
});

// POST /api/investigations/start — start investigation
router.post('/start', authenticate, async (req, res, next) => {
  try {
    const { caseId, rootWallet, blockchain, token, tracingDepth = 3 } = req.body;
    if (!caseId || !rootWallet || !blockchain) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'caseId, rootWallet, and blockchain are required.' } });
    }
    // No DB: return pre-built demo investigation immediately
    if (!isDatabaseConnected()) {
      const inv = demoStore.getInvestigation();
      return res.status(201).json({ success: true, data: { investigation: inv, demoMode: true } });
    }
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });
    const isDemo = caseDoc.isDemo;
    const inv = new Investigation({
      case: caseId, startedBy: req.user._id, rootWallet, blockchain,
      token: token || 'USDT', tracingDepth, status: 'COLLECTING', isDemo,
    });
    await inv.save();
    await Case.findByIdAndUpdate(caseId, { $push: { investigations: inv._id }, status: 'ACTIVE' });
    await createAuditLog({
      action: 'INVESTIGATION_STARTED', userId: req.user._id, username: req.user.username,
      caseId, objectType: 'INVESTIGATION', objectId: inv._id.toString(),
      description: `Investigation started for wallet: ${rootWallet}`, isDemo,
    });
    if (isDemo || process.env.DEMO_MODE === 'true') {
      await populateDemoInvestigation(inv, caseId, req.user._id);
    }
    const populated = await Investigation.findById(inv._id).populate('findings');
    res.status(201).json({ success: true, data: { investigation: populated } });
  } catch (error) { next(error); }
});

// GET /api/investigations/:id/graph — get graph data
router.get('/:id/graph', authenticate, async (req, res, next) => {
  try {
    // No DB: return pre-built demo graph data
    if (!isDatabaseConnected()) {
      return res.json({ success: true, data: { ...demoStore.getGraphData(), demoMode: true } });
    }
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investigation not found.' } });

    const wallets = await Wallet.find({ case: inv.case });
    const transactions = await Transaction.find({ case: inv.case }).sort({ timestamp: 1 });

    // Build graph elements for Cytoscape
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
        isDemo: w.isDemo,
      },
    }));

    const edges = transactions.map((tx, i) => ({
      data: {
        id: `edge-${tx.transactionHash || i}`,
        source: tx.from,
        target: tx.to,
        transactionHash: tx.transactionHash,
        amount: tx.amount,
        token: tx.token,
        timestamp: tx.timestamp,
        status: tx.transactionStatus,
        isDemo: tx.isDemo,
      },
    }));

    res.json({
      success: true,
      data: {
        nodes,
        edges,
        isDemo: inv.isDemo,
        investigationId: inv._id,
      },
    });
  } catch (error) { next(error); }
});

// GET /api/investigations/:id/findings
router.get('/:id/findings', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({ success: true, data: { findings: demoStore.getFindings(), demoMode: true } });
    }
    const inv = await Investigation.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investigation not found.' } });
    const findings = await Finding.find({ investigation: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { findings } });
  } catch (error) { next(error); }
});

// Helper: populate demo investigation
async function populateDemoInvestigation(inv, caseId, userId) {
  try {
    // Create wallets
    for (const nodeData of DEMO_GRAPH_NODES) {
      const exists = await Wallet.findOne({ address: nodeData.id, case: caseId });
      if (!exists) {
        await Wallet.create({
          address: nodeData.id,
          blockchain: 'TRON',
          token: 'USDT',
          contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          classification: nodeData.type,
          riskLevel: nodeData.riskLevel,
          riskScore: nodeData.type === 'REPORTED_SUSPECT' ? 90 : nodeData.type === 'VASP_DEPOSIT' ? 55 : 75,
          stats: {
            transactionCount: nodeData.txCount,
            totalReceived: nodeData.balance,
            totalSent: nodeData.type === 'VASP_DEPOSIT' ? '0' : nodeData.balance,
          },
          vaspAttribution: nodeData.vaspName ? {
            vaspName: nodeData.vaspName,
            attributionType: 'INDIRECT',
            confidence: nodeData.confidence,
            evidence: ['Transaction velocity', 'Multiple counterparties'],
            attributedAt: new Date(),
          } : undefined,
          case: caseId,
          addedBy: userId,
          isOriginalReported: nodeData.isOriginal || false,
          hopDepth: DEMO_GRAPH_NODES.indexOf(DEMO_GRAPH_NODES.find(n => n.id === nodeData.id)),
          isDemo: true,
        });
      }
    }

    // Create transactions
    for (const txData of DEMO_TRANSACTIONS) {
      const exists = await Transaction.findOne({ transactionHash: txData.transactionHash });
      if (!exists) {
        await Transaction.create({
          ...txData,
          provenance: {
            provider: 'DEMO',
            blockchain: 'TRON',
            retrievedAt: new Date(),
            requestType: 'DEMO_DATA',
            sourceStatus: 'DEMO',
          },
          case: caseId,
          investigation: inv._id,
          isDemo: true,
        });
      }
    }

    // Create findings
    const findingIds = [];
    for (const findingData of DEMO_FINDINGS) {
      const finding = await Finding.create({
        ...findingData,
        case: caseId,
        investigation: inv._id,
        isDemo: true,
      });
      findingIds.push(finding._id);
    }

    // Update investigation
    await Investigation.findByIdAndUpdate(inv._id, {
      status: 'COMPLETE',
      findings: findingIds,
      completedAt: new Date(),
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
    });
  } catch (error) {
    console.error('Demo investigation population error:', error.message);
  }
}

// POST /api/investigations/analyze — run full analysis pipeline on a wallet
// Works in demo mode (no DB) using the full tracing + pattern + VASP engines
router.post('/analyze', authenticate, async (req, res, next) => {
  try {
    const { address, chain = 'TRON', token = 'USDT', maxHops = 3, caseId } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'address is required.' } });
    }

    // 1. Trace funds
    const traceResult = await traceForward(address, chain, token, maxHops);

    // 2. Detect patterns
    const findings = detectPatterns(traceResult);

    // 3. VASP attribution
    const vaspAttributions = attributeVasps(traceResult.wallets, traceResult.transactions);
    const vaspFindings = vaspAttributions.map(v => v.finding).filter(Boolean);
    findings.push(...vaspFindings);

    // 4. Classify wallets
    const classifiedWallets = traceResult.wallets.map(w => {
      const addr = w.address || w.id;
      return {
        ...w,
        classification: classifyWallet(addr, traceResult.transactions, w.classification),
        vaspAttribution: vaspAttributions.find(v => v.address === addr),
      };
    });

    // 5. Calculate risk
    const risk = calculateRiskLevel(findings);

    // 6. Build recommendations
    const recommendations = buildRecommendations(findings, vaspAttributions, classifiedWallets);

    res.json({
      success: true,
      data: {
        address, chain, token, maxHops,
        wallets: classifiedWallets,
        transactions: traceResult.transactions,
        findings,
        vaspAttributions,
        risk,
        recommendations,
        isLive: traceResult.isLive,
        isDemo: traceResult.isDemo,
        dataSource: traceResult.dataSource,
        analyzedAt: new Date(),
      },
    });
  } catch (error) { next(error); }
});

function buildRecommendations(findings, vaspAttributions, wallets) {
  const recs = [];
  const findingTypes = new Set(findings.map(f => f.findingType));

  if (vaspAttributions.length > 0) {
    recs.push(`Review possible VASP destination wallet${vaspAttributions.length > 1 ? 's' : ''} and initiate LEA coordination for account information request.`);
  }
  if (findingTypes.has('RAPID_MOVEMENT') || findingTypes.has('MULTI_HOP_LAYERING')) {
    recs.push('Preserve all transaction evidence with timestamps and data provenance records.');
    recs.push('Trace all intermediary wallets for additional counterparty intelligence.');
  }
  if (findingTypes.has('SPLITTING')) {
    recs.push('Investigate the destination wallets of all split transactions independently.');
  }
  if (wallets.some(w => w.classification === 'MULE')) {
    recs.push('Review possible mule wallet operators — cross-reference with other case data.');
  }
  recs.push('Continue monitoring reported and intermediary wallets for new transaction activity.');
  recs.push('Document all analytical findings with data provenance before further investigation steps.');

  return recs;
}

export default router;
