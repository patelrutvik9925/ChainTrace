import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { AppError, requireDatabase } from '../middleware/errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';
import Case from '../models/case.model.js';
import { createAuditLog } from '../services/audit.service.js';
import { demoStore, DEMO_IDS } from '../services/demoStore.service.js';

const router = express.Router();

function generateCaseId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `SIH-${year}-${rand}`;
}

// GET /api/cases
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Demo fallback: return pre-built case list
    if (!isDatabaseConnected()) {
      const cases = demoStore.getCases(req.user._id || req.user.id);
      return res.json({ success: true, data: { cases, total: cases.length, page: 1, limit: 20, demoMode: true } });
    }
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.$text = { $search: search };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      Case.find(filter).populate('createdBy', 'username fullName').populate('assignedTo', 'username fullName').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Case.countDocuments(filter),
    ]);
    res.json({ success: true, data: { cases, total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
});

// GET /api/cases/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      // Serve demo case for any demo ID or the known demo case ID
      const id = req.params.id;
      if (id === DEMO_IDS.caseMongoId || id === DEMO_IDS.caseId || id === 'SIH-2026-DEMO1') {
        return res.json({ success: true, data: { case: demoStore.getCase(req.user._id || req.user.id) } });
      }
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found (Demo Mode — no DB).' } });
    }
    const caseDoc = await Case.findOne({ $or: [{ _id: req.params.id }, { caseId: req.params.id }] })
      .populate('createdBy', 'username fullName role')
      .populate('assignedTo', 'username fullName role');
    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });
    res.json({ success: true, data: { case: caseDoc } });
  } catch (error) { next(error); }
});

// POST /api/cases
router.post('/', authenticate, authorize('ADMIN', 'INVESTIGATOR'), [
  body('caseName').trim().notEmpty().withMessage('Case name is required').isLength({ max: 200 }),
  body('victimInfo.blockchain').optional().isIn(['TRON', 'ETHEREUM', 'BITCOIN', 'UNKNOWN']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: errors.array() } });
    }
    // Demo fallback: acknowledge creation, return a synthetic case object
    if (!isDatabaseConnected()) {
      const caseId = generateCaseId();
      const demoCase = {
        _id: `demo-new-${Date.now()}`,
        caseId,
        caseName: req.body.caseName || 'New Demo Case',
        description: req.body.caseDescription || '',
        status: 'OPEN',
        priority: req.body.priority || 'MEDIUM',
        createdBy: { _id: req.user._id || req.user.id, username: req.user.username, fullName: req.user.fullName },
        assignedTo: { _id: req.user._id || req.user.id, username: req.user.username, fullName: req.user.fullName },
        victimInfo: req.body.victimInfo || {},
        tags: req.body.tags || [],
        isDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return res.status(201).json({ success: true, data: { case: demoCase, isDemo: true, note: 'Case created in demo mode (not persisted).' } });
    }
    const caseData = {
      ...req.body,
      caseId: generateCaseId(),
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id,
    };
    const newCase = new Case(caseData);
    await newCase.save();
    await newCase.populate('createdBy', 'username fullName');
    await createAuditLog({
      action: 'CASE_CREATED', userId: req.user._id, username: req.user.username,
      caseId: newCase._id, objectType: 'CASE', objectId: newCase.caseId,
      description: `Case created: ${newCase.caseName}`, isDemo: newCase.isDemo,
    });
    res.status(201).json({ success: true, data: { case: newCase } });
  } catch (error) { next(error); }
});

// PATCH /api/cases/:id — requires DB
router.patch('/:id', authenticate, authorize('ADMIN', 'INVESTIGATOR'), requireDatabase, async (req, res, next) => {
  try {
    const allowedUpdates = ['caseName', 'description', 'status', 'priority', 'assignedTo', 'tags', 'victimInfo'];
    const updates = {};
    allowedUpdates.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const caseDoc = await Case.findOneAndUpdate(
      { $or: [{ _id: req.params.id }, { caseId: req.params.id }] },
      { $set: updates }, { new: true }
    ).populate('createdBy assignedTo', 'username fullName');
    if (!caseDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } });
    await createAuditLog({
      action: 'CASE_UPDATED', userId: req.user._id, username: req.user.username,
      caseId: caseDoc._id, objectType: 'CASE', objectId: caseDoc.caseId,
      description: `Case updated: ${JSON.stringify(Object.keys(updates))}`,
    });
    res.json({ success: true, data: { case: caseDoc } });
  } catch (error) { next(error); }
});

// POST /api/cases/demo/create — works with OR without DB
router.post('/demo/create', authenticate, authorize('ADMIN', 'INVESTIGATOR'), async (req, res, next) => {
  try {
    // No DB: return in-memory demo case
    if (!isDatabaseConnected()) {
      const demoCase = demoStore.getCase(req.user._id || req.user.id);
      return res.json({ success: true, data: { case: demoCase, alreadyExisted: true, demoMode: true } });
    }
    // With DB: create/find persisted demo case
    const existing = await Case.findOne({ isDemo: true, status: { $ne: 'ARCHIVED' } });
    if (existing) return res.json({ success: true, data: { case: existing, alreadyExisted: true } });
    const demoData = demoStore.getCase(req.user._id);
    demoData.caseId = generateCaseId();
    delete demoData._id; // let Mongoose generate the _id
    const demoCase = new Case(demoData);
    await demoCase.save();
    await demoCase.populate('createdBy', 'username fullName');
    await createAuditLog({
      action: 'CASE_CREATED', userId: req.user._id, username: req.user.username,
      caseId: demoCase._id, description: 'Demo case created', isDemo: true,
    });
    res.status(201).json({ success: true, data: { case: demoCase } });
  } catch (error) { next(error); }
});

export default router;
