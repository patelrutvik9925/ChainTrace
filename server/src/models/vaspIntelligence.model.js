import mongoose from 'mongoose';

const vaspIntelligenceSchema = new mongoose.Schema({
  vaspName: { type: String, required: true, index: true },
  legalName: { type: String },
  country: { type: String },
  website: { type: String },
  blockchain: { type: String, required: true },
  addresses: [{
    address: { type: String, required: true },
    addressType: {
      type: String,
      enum: ['DEPOSIT', 'OMNIBUS', 'HOT_WALLET', 'COLD_WALLET', 'KNOWN'],
      default: 'KNOWN',
    },
    verified: { type: Boolean, default: false },
  }],
  source: { type: String, required: true }, // e.g., 'PUBLIC_RESEARCH', 'LEA_INTEL', 'DEMO'
  sourceDate: { type: Date },
  confidence: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM',
  },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
});

vaspIntelligenceSchema.index({ 'addresses.address': 1, blockchain: 1 });

const VaspIntelligence = mongoose.model('VaspIntelligence', vaspIntelligenceSchema);
export default VaspIntelligence;
