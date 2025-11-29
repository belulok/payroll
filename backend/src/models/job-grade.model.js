const mongoose = require('mongoose');

const jobGradeSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Job Grade Information
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

  // Associated Job Band
  jobBand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'job-bands'
  },



  // Hierarchy Level (for sorting within band)
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
jobGradeSchema.index({ company: 1, name: 1 });
jobGradeSchema.index({ company: 1, code: 1 }, { unique: true, sparse: true });
jobGradeSchema.index({ company: 1, isActive: 1 });
jobGradeSchema.index({ company: 1, jobBand: 1 });
jobGradeSchema.index({ company: 1, level: 1 });

const JobGrade = mongoose.model('job-grades', jobGradeSchema);

module.exports = JobGrade;

