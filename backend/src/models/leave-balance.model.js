const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  // References
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'workers',
    required: true,
    index: true
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'leave-types',
    required: true
  },

  // Balance Information
  year: {
    type: Number,
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    default: 0
  },
  usedDays: {
    type: Number,
    default: 0
  },
  pendingDays: {
    type: Number,
    default: 0
  },
  carriedForwardDays: {
    type: Number,
    default: 0
  },

}, {
  timestamps: true
});

// Compound indexes
leaveBalanceSchema.index({ company: 1, worker: 1, leaveType: 1, year: 1 }, { unique: true });
leaveBalanceSchema.index({ worker: 1, year: 1 });

// Virtual for remaining days
leaveBalanceSchema.virtual('remainingDays').get(function() {
  return this.totalDays - this.usedDays - this.pendingDays;
});

// Methods
leaveBalanceSchema.methods.canTakeLeave = function(days) {
  return this.remainingDays >= days;
};

leaveBalanceSchema.methods.reserveDays = function(days) {
  if (!this.canTakeLeave(days)) {
    throw new Error('Insufficient leave balance');
  }
  this.pendingDays += days;
  return this.save();
};

leaveBalanceSchema.methods.approveDays = function(days) {
  this.pendingDays -= days;
  this.usedDays += days;
  return this.save();
};

leaveBalanceSchema.methods.rejectDays = function(days) {
  this.pendingDays -= days;
  return this.save();
};

// Cancel approved leave - restore used days back to available
leaveBalanceSchema.methods.cancelApprovedDays = function(days) {
  this.usedDays = Math.max(0, this.usedDays - days);
  return this.save();
};

const LeaveBalance = mongoose.model('leave-balances', leaveBalanceSchema);

module.exports = LeaveBalance;

