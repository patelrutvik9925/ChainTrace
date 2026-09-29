import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDatabase } from '../middleware/errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';
import Case from '../models/case.model.js';
import Investigation from '../models/investigation.model.js';
import Finding from '../models/finding.model.js';
import Wallet from '../models/wallet.model.js';
import Transaction from '../models/transaction.model.js';
import { createAuditLog } from '../services/audit.service.js';
import { demoStore } from '../services/demoStore.service.js';

const router = express.Router();

// POST /api/reports/generate — generate investigation report
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    // No DB: return pre-built demo report
    if (!isDatabaseConnected()) {
      const report = demoStore.getReport(req.user.username || req.user.fullName);
      return res.json({ success: true, data: { report, demoMode: true } });
    }

    const { caseId, investigationId } = req.body;

    const [caseDoc, inv, wallets, transactions, findings] = await Promise.all([
      Case.findById(caseId).populate('createdBy assignedTo', 'username fullName'),
      Investigation.findById(investigationId).populate('startedBy', 'username fullName'),
      Wallet.find({ case: caseId }),
      Transaction.find({ case: caseId }).sort({ timestamp: 1 }),
      Finding.find({ investigation: investigationId }),
    ]);

    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });

    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.username,
      isDemo: caseDoc.isDemo,
      caseInformation: {
        caseId: caseDoc.caseId,
        caseName: caseDoc.caseName,
        status: caseDoc.status,
        priority: caseDoc.priority,
        createdBy: caseDoc.createdBy?.fullName,
        assignedTo: caseDoc.assignedTo?.fullName,
        createdAt: caseDoc.createdAt,
      },
      input: {
        reportedWallet: caseDoc.victimInfo?.reportedWallet,
        blockchain: caseDoc.victimInfo?.blockchain,
        asset: caseDoc.victimInfo?.asset,
        reportDate: caseDoc.victimInfo?.reportDate,
        ncrbReference: caseDoc.victimInfo?.ncrbComplaintNumber,
        estimatedLoss: caseDoc.victimInfo?.estimatedLoss,
      },
      investigationSummary: inv ? {
        status: inv.status,
        walletsAnalyzed: inv.summary?.totalWallets,
        transactionsAnalyzed: inv.summary?.totalTransactions,
        hopsTraced: inv.progress?.hopsTraced,
        riskLevel: inv.summary?.riskLevel,
        riskIndicators: inv.summary?.riskIndicators,
        possibleVasps: inv.summary?.possibleVasps,
        patternsFound: inv.summary?.patternsFound,
      } : null,
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
        dataSource: tx.dataSource,
      })),
      findings: findings.map(f => ({
        type: f.findingType,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        confidence: f.confidence,
        evidence: f.evidence,
      })),
      recommendations: buildRecommendations(findings, wallets),
      limitations: [
        'This report is an analytical assessment based on blockchain transaction patterns.',
        'VASP attribution is based on behavioral analysis and should be verified through official LEA coordination.',
        'Blockchain analytics cannot definitively identify individuals.',
        caseDoc.isDemo ? '⚠️ THIS IS A DEMONSTRATION REPORT — NOT BASED ON LIVE BLOCKCHAIN DATA.' : null,
      ].filter(Boolean),
      disclaimer: 'This report is produced for investigative intelligence purposes only. It does not constitute legal evidence without proper verification and chain-of-custody procedures.',
    };

    await createAuditLog({
      action: 'REPORT_GENERATED',
      userId: req.user._id,
      username: req.user.username,
      caseId,
      objectType: 'REPORT',
      description: `Investigation report generated for case ${caseDoc.caseId}`,
      isDemo: caseDoc.isDemo,
    });

    res.json({ success: true, data: { report } });
  } catch (error) { next(error); }
});

function buildRecommendations(findings, wallets) {
  const recs = [];
  const types = new Set(findings.map(f => f.findingType));
  const vaspWallets = wallets.filter(w => w.vaspAttribution?.vaspName);
  if (vaspWallets.length > 0) {
    recs.push(`Review possible VASP destination wallet(s): ${vaspWallets.map(w => w.address.substring(0,12)+'…').join(', ')} — initiate LEA coordination for account information request.`);
  }
  if (types.has('RAPID_MOVEMENT') || types.has('MULTI_HOP_LAYERING')) {
    recs.push('Preserve all transaction evidence with timestamps and data provenance records before further investigation.');
    recs.push('Trace all intermediary wallets for additional counterparty intelligence.');
  }
  if (types.has('SPLITTING')) {
    recs.push('Investigate all destination wallets from the fund-splitting transaction independently.');
  }
  if (wallets.some(w => w.classification === 'MULE')) {
    recs.push('Review possible mule wallet operators — cross-reference with other case data and victim statements.');
  }
  recs.push('Continue monitoring all reported and intermediary wallets for new transaction activity.');
  recs.push('Document all analytical findings with data provenance before any enforcement steps.');
  return recs;
}

export default router;
