import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema({
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
  investigation: { type: mongoose.Schema.Types.ObjectId, ref: 'Investigation', index: true },

  findingType: {
    type: String,
    enum: [
      'RAPID_MOVEMENT',
      'MULTI_HOP_LAYERING',
      'SPLITTING',
      'CONSOLIDATION',
      'PEEL_CHAIN',
      'REPEATED_TRANSFERS',
      'HIGH_VELOCITY',
      'MIXER_INTERACTION',
      'CROSS_CHAIN',
      'VASP_DEPOSIT',
      'VASP_ATTRIBUTION',
      'SUSPICIOUS_WALLET',
      'WALLET_CLASSIFICATION',
      'MONITORING_ALERT',
    ],
    required: true,
    index: true,
  },

  severity: {
    type: String,
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
  },

  title: { type: String, required: true },
  explanation: { type: String, required: true },

  // Supporting evidence
  evidence: {
    observations: [{ type: String }],
    transactionHashes: [{ type: String }],
    walletAddresses: [{ type: String }],
    timestamps: [{ type: Date }],
    dataSource: { type: String },
    analysisRule: { type: String },
    limitations: { type: String },
  },

  confidence: {
    level: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'] },
    score: { type: Number, min: 0, max: 100 },
    basis: [{ type: String }],
  },

  relatedWallets: [{ type: String }],
  relatedTransactions: [{ type: String }],

  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

const Finding = mongoose.model('Finding', findingSchema);
export default Finding;
