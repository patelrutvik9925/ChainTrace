import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireDatabase } from '../middleware/errorHandler.js';
import { isDatabaseConnected } from '../config/database.js';
import Alert from '../models/alert.model.js';
import { createAuditLog } from '../services/audit.service.js';
import { demoStore } from '../services/demoStore.service.js';

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      let alerts = demoStore.getAlerts();
      const { status, severity } = req.query;
      if (status) alerts = alerts.filter(a => a.status === status);
      if (severity) alerts = alerts.filter(a => a.severity === severity);
      return res.json({ success: true, data: { alerts, total: alerts.length, demoMode: true } });
    }
    const { caseId, status, severity, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (caseId) filter.case = caseId;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Alert.countDocuments(filter),
    ]);
    res.json({ success: true, data: { alerts, total } });
  } catch (error) { next(error); }
});

router.patch('/:id/acknowledge', authenticate, requireDatabase, async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: req.user._id,
      acknowledgedAt: new Date(),
    }, { new: true });
    if (!alert) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Alert not found.' } });
    await createAuditLog({
      action: 'ALERT_ACKNOWLEDGED',
      userId: req.user._id,
      username: req.user.username,
      caseId: alert.case,
      objectType: 'ALERT',
      objectId: alert._id.toString(),
      description: `Alert acknowledged: ${alert.title}`,
    });
    res.json({ success: true, data: { alert } });
  } catch (error) { next(error); }
});

// Create alert (internal/system use, also exposed for demo)
router.post('/', authenticate, requireDatabase, async (req, res, next) => {
  try {
    const alert = new Alert({ ...req.body, isDemo: req.body.isDemo || false });
    await alert.save();
    await createAuditLog({
      action: 'ALERT_GENERATED',
      userId: req.user._id,
      username: req.user.username,
      caseId: req.body.case,
      objectType: 'ALERT',
      description: `Alert created: ${req.body.title}`,
      isDemo: req.body.isDemo,
    });
    res.status(201).json({ success: true, data: { alert } });
  } catch (error) { next(error); }
});

export default router;
