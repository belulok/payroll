const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Department Information
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

  // Hierarchy
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'departments'
  },

  // Department Head
  headOfDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'workers'
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
departmentSchema.index({ company: 1, name: 1 });
departmentSchema.index({ company: 1, code: 1 }, { unique: true, sparse: true });
departmentSchema.index({ company: 1, isActive: 1 });

const Department = mongoose.model('departments', departmentSchema);

module.exports = Department;

