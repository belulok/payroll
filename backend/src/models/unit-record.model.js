const mongoose = require('mongoose');

const unitRecordSchema = new mongoose.Schema({
  // References (Multi-tenant)
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
  
  // Unit Information
  date: {
    type: Date,
    required: true
  },
  unitType: {
    type: String,
    required: true,
    trim: true
  },
  unitsCompleted: {
    type: Number,
    required: true,
    min: 0
  },
  ratePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Quality Control
  unitsRejected: {
    type: Number,
    default: 0,
    min: 0
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Project/Site Information
  project: {
    name: String,
    code: String,
    location: String
  },
  
  // Verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  verifiedAt: Date,
  
  // Approval Workflow
  status: {
    type: String,
    enum: ['draft', 'submitted', 'verified', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Supporting Evidence
  photos: [{
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  
  // Metadata
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  
}, {
  timestamps: true
});

// Indexes
unitRecordSchema.index({ company: 1, worker: 1, date: 1 });
unitRecordSchema.index({ company: 1, status: 1 });
unitRecordSchema.index({ worker: 1, status: 1 });
unitRecordSchema.index({ date: 1 });

// Pre-save hook to calculate total amount
unitRecordSchema.pre('save', function(next) {
  const acceptedUnits = this.unitsCompleted - (this.unitsRejected || 0);
  this.totalAmount = acceptedUnits * this.ratePerUnit;
  next();
});

// Methods
unitRecordSchema.methods.submit = function() {
  if (this.status !== 'draft') {
    throw new Error('Only draft records can be submitted');
  }
  this.status = 'submitted';
  return this.save();
};

unitRecordSchema.methods.verify = function(verifiedByUserId) {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted records can be verified');
  }
  this.status = 'verified';
  this.verifiedBy = verifiedByUserId;
  this.verifiedAt = new Date();
  return this.save();
};

unitRecordSchema.methods.approve = function(approvedByUserId) {
  if (this.status !== 'verified') {
    throw new Error('Only verified records can be approved');
  }
  this.status = 'approved';
  this.approvedBy = approvedByUserId;
  this.approvedAt = new Date();
  return this.save();
};

unitRecordSchema.methods.reject = function(approvedByUserId, reason) {
  this.status = 'rejected';
  this.approvedBy = approvedByUserId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Statics
unitRecordSchema.statics.getApprovedUnitsForPeriod = function(workerId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        worker: workerId,
        status: 'approved',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$unitType',
        totalUnits: { $sum: '$unitsCompleted' },
        totalRejected: { $sum: '$unitsRejected' },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

const UnitRecord = mongoose.model('unit-records', unitRecordSchema);

module.exports = UnitRecord;

