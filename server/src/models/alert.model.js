import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
  wallet: { type: String, required: true, index: true },
  blockchain: { type: String },
  transactionHash: { type: String },

  alertType: {
    type: String,
    enum: [
      'NEW_TRANSACTION',
      'LARGE_TRANSFER',
      'RAPID_MOVEMENT',
      'NEW_INTERMEDIARY',
      'POSSIBLE_VASP',
      'CROSS_CHAIN',
      'MIXER_INTERACTION',
      'RISK_INCREASE',
      'MONITORING_UPDATE',
      'PATTERN_DETECTED',
    ],
    required: true,
    index: true,
  },

  severity: {
    type: String,
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true,
  },

  title: { type: String, required: true },
  message: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },

  status: {
    type: String,
    enum: ['UNREAD', 'READ', 'ACKNOWLEDGED', 'DISMISSED'],
    default: 'UNREAD',
    index: true,
  },

  // Context for navigation
  context: {
    caseId: { type: String },
    walletAddress: { type: String },
    transactionHash: { type: String },
    investigationId: { type: String },
  },

  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

alertSchema.index({ createdAt: -1 });
alertSchema.index({ case: 1, status: 1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
