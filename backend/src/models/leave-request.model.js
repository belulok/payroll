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
    ref: 'leave-types',
    required: true
  },
  leaveBalance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'leave-balances'
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

leaveRequestSchema.methods.cancel = async function() {
  if (this.status === 'approved') {
    throw new Error('Cannot cancel approved leave. Please create a new request.');
  }
  
  this.status = 'cancelled';
  
  // Release reserved days if pending
  if (this.status === 'pending' && this.leaveBalance) {
    const LeaveBalance = mongoose.model('leave-balances');
    const balance = await LeaveBalance.findById(this.leaveBalance);
    if (balance) {
      await balance.rejectDays(this.totalDays);
    }
  }
  
  return this.save();
};

const LeaveRequest = mongoose.model('leave-requests', leaveRequestSchema);

module.exports = LeaveRequest;

