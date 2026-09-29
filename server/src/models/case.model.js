import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  caseName: {
    type: String,
    required: [true, 'Case name is required'],
    trim: true,
    maxlength: 200,
  },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['OPEN', 'ACTIVE', 'UNDER_REVIEW', 'PENDING_VASP', 'ESCALATED', 'CLOSED', 'ARCHIVED'],
    default: 'OPEN',
    index: true,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    index: true,
  },
  // Original victim-reported information
  victimInfo: {
    reportedWallet: { type: String, trim: true },
    blockchain: { type: String, trim: true },
    asset: { type: String, trim: true },
    reportDate: { type: Date },
    ncrbComplaintNumber: { type: String, trim: true },
    victimDescription: { type: String, trim: true },
    estimatedLoss: { type: String },
    currency: { type: String, default: 'INR' },
  },
  // Assigned personnel
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Related objects
  wallets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' }],
  investigations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Investigation' }],
  reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
  tags: [{ type: String, trim: true }],
  // Metadata
  closedAt: { type: Date },
  closureReason: { type: String },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

caseSchema.index({ caseName: 'text', description: 'text' });
caseSchema.index({ createdAt: -1 });

const Case = mongoose.model('Case', caseSchema);
export default Case;
