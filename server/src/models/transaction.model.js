import mongoose from 'mongoose';

// Normalized transaction format — chain-agnostic
const transactionSchema = new mongoose.Schema({
  // Core normalized fields
  chain: { type: String, required: true, enum: ['TRON', 'ETHEREUM', 'BITCOIN', 'UNKNOWN'] },
  transactionHash: { type: String, required: true, index: true },
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  token: { type: String, default: 'NATIVE' },
  amount: { type: String, default: '0' }, // String to preserve precision
  amountRaw: { type: String }, // Raw blockchain units
  timestamp: { type: Date, index: true },
  blockNumber: { type: Number },
  transactionStatus: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING', 'UNKNOWN'], default: 'UNKNOWN' },
  contractAddress: { type: String },
  dataSource: { type: String }, // e.g. 'TRONGRID', 'TRONSCAN', 'DEMO'

  // Data provenance
  provenance: {
    provider: { type: String },
    blockchain: { type: String },
    retrievedAt: { type: Date, default: Date.now },
    requestType: { type: String },
    sourceStatus: { type: String },
    referenceUrl: { type: String },
  },

  // Investigation linkage
  case: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', index: true },
  investigation: { type: mongoose.Schema.Types.ObjectId, ref: 'Investigation' },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

transactionSchema.index({ chain: 1, transactionHash: 1 }, { unique: true });
transactionSchema.index({ case: 1, timestamp: -1 });
transactionSchema.index({ from: 1, to: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
