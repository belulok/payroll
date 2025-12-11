const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
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
    ref: 'leave-types'
    // Not required - can use leaveTypeName/leaveTypeCode instead
  },
  // Store leave type info for when leaveType ObjectId is not available
  leaveTypeName: {
    type: String,
    trim: true
  },
  leaveTypeCode: {
    type: String,
    uppercase: true,
    trim: true
  },
  leaveBalance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'leave-balances'
  },

  // Half day support
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayPeriod: {
    type: String,
    enum: ['AM', 'PM'],
    default: 'AM'
  },

  // Leave Details
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0.5
  },
  reason: {
    type: String,
    trim: true
  },

  // Supporting Documents
  documents: [{
    name: String,
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],

  // Approval Workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  approvedAt: Date,
  rejectionReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  cancelledAt: Date,

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  notes: String,

}, {
  timestamps: true
});

// Indexes
leaveRequestSchema.index({ company: 1, status: 1 });
leaveRequestSchema.index({ worker: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

// Methods
leaveRequestSchema.methods.approve = async function(approvedByUserId) {
  this.status = 'approved';
  this.approvedBy = approvedByUserId;
  this.approvedAt = new Date();

  // Update leave balance
  if (this.leaveBalance) {
    const LeaveBalance = mongoose.model('leave-balances');
    const balance = await LeaveBalance.findById(this.leaveBalance);
    if (balance) {
      await balance.approveDays(this.totalDays);
    }
  }

  return this.save();
};

leaveRequestSchema.methods.reject = async function(approvedByUserId, reason) {
  this.status = 'rejected';
  this.approvedBy = approvedByUserId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;

  // Release reserved days
  if (this.leaveBalance) {
    const LeaveBalance = mongoose.model('leave-balances');
    const balance = await LeaveBalance.findById(this.leaveBalance);
    if (balance) {
      await balance.rejectDays(this.totalDays);
    }
  }

  return this.save();
};

leaveRequestSchema.methods.cancel = async function(cancelledByUserId) {
  const previousStatus = this.status;
  this.status = 'cancelled';
  this.cancelledBy = cancelledByUserId;
  this.cancelledAt = new Date();

  if (this.leaveBalance) {
    const LeaveBalance = mongoose.model('leave-balances');
    const balance = await LeaveBalance.findById(this.leaveBalance);
    if (balance) {
      if (previousStatus === 'pending') {
        // Release reserved/pending days
        await balance.rejectDays(this.totalDays);
      } else if (previousStatus === 'approved') {
        // Restore used days back to available
        await balance.cancelApprovedDays(this.totalDays);
      }
    }
  }

  return this.save();
};

const LeaveRequest = mongoose.model('leave-requests', leaveRequestSchema);

module.exports = LeaveRequest;

