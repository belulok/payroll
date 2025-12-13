const mongoose = require('mongoose');

const workerGroupSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Notes
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
workerGroupSchema.index({ company: 1, name: 1 });
workerGroupSchema.index({ company: 1, code: 1 });
workerGroupSchema.index({ company: 1, isActive: 1 });

const WorkerGroup = mongoose.model('worker-groups', workerGroupSchema);

module.exports = WorkerGroup;




