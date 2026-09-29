import AuditLog from '../models/auditLog.model.js';
import logger from '../config/logger.js';
import { isDatabaseConnected } from '../config/database.js';

export async function createAuditLog(data) {
  // Skip DB operations immediately when not connected — avoids 10s buffer timeout
  if (!isDatabaseConnected()) {
    logger.debug(`[AUDIT SKIPPED — no DB] ${data.action} by ${data.username || 'unknown'}`);
    return null;
  }
  try {
    const log = new AuditLog({
      user: data.userId,
      username: data.username,
      action: data.action,
      case: data.caseId,
      objectType: data.objectType,
      objectId: data.objectId,
      description: data.description,
      result: data.result || 'SUCCESS',
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      isDemo: data.isDemo || false,
    });
    await log.save();
    return log;
  } catch (error) {
    // Never crash the app due to audit log failure
    logger.error('Failed to create audit log:', error.message);
  }
}

export async function getAuditLogs({ caseId, userId, action, limit = 50, skip = 0 } = {}) {
  if (!isDatabaseConnected()) return [];

  const query = {};
  if (caseId) query.case = caseId;
  if (userId) query.user = userId;
  if (action) query.action = action;

  return AuditLog.find(query)
    .populate('user', 'username fullName role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}
