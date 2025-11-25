const mongoose = require('mongoose');

const leaveTierSchema = new mongoose.Schema({
  tierName: {
    type: String,
    required: true,
    trim: true
  },
  daysAllowed: {
    type: Number,
    required: true,
    min: 0
  },
  description: String
}, { _id: false });

const leaveTypeSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },
  
  // Leave Type Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  description: String,
  
  // Leave Configuration
  isPaid: {
    type: Boolean,
    default: true
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  requiresDocument: {
    type: Boolean,
    default: false
  },
  
  // Tiered Allocation
  useTiers: {
    type: Boolean,
    default: false
  },
  defaultDaysAllowed: {
    type: Number,
    default: 0,
    min: 0
  },
  tiers: [leaveTierSchema],
  
  // Carry Forward Rules
  allowCarryForward: {
    type: Boolean,
    default: false
  },
  maxCarryForwardDays: {
    type: Number,
    default: 0
  },
  
  // Restrictions
  minDaysNotice: {
    type: Number,
    default: 0
  },
  maxConsecutiveDays: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
}, {
  timestamps: true
});

// Compound indexes
leaveTypeSchema.index({ company: 1, code: 1 }, { unique: true });
leaveTypeSchema.index({ company: 1, isActive: 1 });

// Methods
leaveTypeSchema.methods.getDaysAllowedForTier = function(tierName) {
  if (!this.useTiers) {
    return this.defaultDaysAllowed;
  }
  
  const tier = this.tiers.find(t => t.tierName === tierName);
  return tier ? tier.daysAllowed : this.defaultDaysAllowed;
};

const LeaveType = mongoose.model('leave-types', leaveTypeSchema);

module.exports = LeaveType;

