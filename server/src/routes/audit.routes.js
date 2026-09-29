import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getAuditLogs } from '../services/audit.service.js';

const router = express.Router();

// No requireDatabase guard here — getAuditLogs already returns [] when DB is down
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { caseId, userId, action, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await getAuditLogs({ caseId, userId, action, limit: parseInt(limit), skip });
    res.json({ success: true, data: { logs } });
  } catch (error) { next(error); }
});

export default router;
