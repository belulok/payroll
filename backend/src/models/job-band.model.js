const mongoose = require('mongoose');

const jobBandSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Job Band Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    sparse: true
  },
  description: {
    type: String,
    trim: true
  },

  // Hierarchy Level (for sorting)
  level: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Metadata
  notes: String,

}, {
  timestamps: true
});

// Compound indexes
jobBandSchema.index({ company: 1, name: 1 });
jobBandSchema.index({ company: 1, code: 1 }, { unique: true, sparse: true });
jobBandSchema.index({ company: 1, isActive: 1 });
jobBandSchema.index({ company: 1, level: 1 });

const JobBand = mongoose.model('job-bands', jobBandSchema);

module.exports = JobBand;

