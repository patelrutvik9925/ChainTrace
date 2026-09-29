import mongoose from 'mongoose';

const investigationSchema = new mongoose.Schema({
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: ['INITIALIZING', 'COLLECTING', 'TRACING', 'ANALYZING', 'COMPLETE', 'ERROR', 'PAUSED'],
    default: 'INITIALIZING',
  },

  // Investigation parameters
  rootWallet: { type: String, required: true },
  blockchain: { type: String, required: true },
  token: { type: String },
  tracingDepth: { type: Number, default: 3 },
  tracingDirection: { type: String, enum: ['FORWARD', 'BACKWARD', 'BOTH'], default: 'FORWARD' },

  // Progress tracking
  progress: {
    currentStep: { type: String },
    stepsCompleted: [{ type: String }],
    walletsCollected: { type: Number, default: 0 },
    transactionsCollected: { type: Number, default: 0 },
    hopsTraced: { type: Number, default: 0 },
    patternsDetected: { type: Number, default: 0 },
  },

  // Findings summary
  summary: {
    totalWallets: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    suspiciousWallets: { type: Number, default: 0 },
    possibleVasps: { type: Number, default: 0 },
    patternsFound: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    riskIndicators: [{ type: String }],
  },

  findings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Finding' }],
  completedAt: { type: Date },
  errorMessage: { type: String },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const Investigation = mongoose.model('Investigation', investigationSchema);
export default Investigation;
