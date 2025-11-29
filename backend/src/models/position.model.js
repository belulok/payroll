const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Position Information
  title: {
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

  // Organizational Structure
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'departments'
  },
  jobBand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'job-bands'
  },
  jobGrade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'job-grades'
  },

  // Reporting Structure
  reportsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'positions'
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
positionSchema.index({ company: 1, title: 1 });
positionSchema.index({ company: 1, code: 1 }, { unique: true, sparse: true });
positionSchema.index({ company: 1, isActive: 1 });
positionSchema.index({ company: 1, department: 1 });

const Position = mongoose.model('positions', positionSchema);

module.exports = Position;

