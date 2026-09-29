import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, 'Wallet address is required'],
    trim: true,
    index: true,
  },
  blockchain: {
    type: String,
    required: true,
    enum: ['TRON', 'ETHEREUM', 'BITCOIN', 'UNKNOWN'],
    index: true,
  },
  token: { type: String, trim: true, default: 'NATIVE' },
  contractAddress: { type: String, trim: true },

  // Classification
  classification: {
    type: String,
    enum: [
      'REPORTED_SUSPECT',
      'FRAUD_SOURCE',
      'INTERMEDIARY',
      'MULE',
      'MIXER_PRIVACY',
      'VASP_DEPOSIT',
      'VASP_OMNIBUS',
      'UNKNOWN',
    ],
    default: 'UNKNOWN',
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  riskIndicators: [{ type: String }],

  // Transaction statistics (populated by collection services)
  stats: {
    transactionCount: { type: Number, default: 0 },
    totalReceived: { type: String, default: '0' },
    totalSent: { type: String, default: '0' },
    firstSeen: { type: Date },
    lastSeen: { type: Date },
    uniqueCounterparties: { type: Number, default: 0 },
  },

  // VASP attribution
  vaspAttribution: {
    vaspName: { type: String },
    attributionType: { type: String, enum: ['DIRECT', 'INDIRECT', 'POSSIBLE', null], default: null },
    confidence: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', null], default: null },
    evidence: [{ type: String }],
    attributedAt: { type: Date },
  },

  // Data provenance
  dataProvenance: {
    provider: { type: String },
    blockchain: { type: String },
    retrievedAt: { type: Date },
    requestType: { type: String },
    sourceStatus: { type: String },
  },

  // Case linkage
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Source of this wallet in the investigation
  sourceWallet: { type: String }, // parent wallet that led here
  hopDepth: { type: Number, default: 0 }, // hops from reported wallet
  isOriginalReported: { type: Boolean, default: false },

  // Monitoring
  isMonitored: { type: Boolean, default: false },
  monitoringSince: { type: Date },
  lastChecked: { type: Date },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

walletSchema.index({ address: 1, blockchain: 1 });
walletSchema.index({ case: 1, classification: 1 });

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
