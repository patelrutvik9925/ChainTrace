import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  username: { type: String }, // denormalized for log readability
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'CASE_CREATED', 'CASE_UPDATED', 'CASE_CLOSED', 'CASE_ARCHIVED',
      'WALLET_ADDED', 'WALLET_UPDATED',
      'INVESTIGATION_STARTED', 'INVESTIGATION_COMPLETED',
      'TRACING_PERFORMED', 'FINDING_GENERATED',
      'MONITORING_STARTED', 'MONITORING_STOPPED',
      'ALERT_GENERATED', 'ALERT_ACKNOWLEDGED',
      'REPORT_GENERATED', 'REPORT_VIEWED',
      'USER_CREATED', 'USER_UPDATED',
      'DATA_EXPORTED', 'SYSTEM_ACCESS',
    ],
    index: true,
  },
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
  objectType: { type: String }, // 'CASE', 'WALLET', 'INVESTIGATION', etc.
  objectId: { type: String },
  description: { type: String },
  result: { type: String, enum: ['SUCCESS', 'FAILURE', 'PARTIAL'], default: 'SUCCESS' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
