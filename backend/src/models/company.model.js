const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Company Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    postcode: String,
    country: { type: String, default: 'Malaysia' }
  },

  // Subscription Details
  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'basic', 'standard', 'premium'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'inactive', 'suspended', 'cancelled'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    maxWorkers: {
      type: Number,
      default: 10
    },
    monthlyFee: {
      type: Number,
      default: 0
    },
    autoRenew: {
      type: Boolean,
      default: true
    }
  },

  // Payment Types Supported
  paymentTypes: [{
    type: String,
    enum: ['monthly-salary', 'hourly', 'unit-based']
  }],

  // Payroll Settings
  payrollSettings: {
    currency: {
      type: String,
      default: 'MYR'
    },
    paymentCycle: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly'],
      default: 'monthly'
    },
    overtimeRates: {
      ot1_5: { type: Number, default: 1.5 },
      ot2_0: { type: Number, default: 2.0 }
    },
    // Malaysian Statutory Contributions
    epfEnabled: { type: Boolean, default: true },
    socsoEnabled: { type: Boolean, default: true },
    eisEnabled: { type: Boolean, default: true }
  },

  // QR Code Settings (for hourly payment type)
  qrCodeSettings: {
    enabled: { type: Boolean, default: false },
    qrCode: String,
    qrCodeGeneratedAt: Date,
    allowManualEdit: { type: Boolean, default: false }
  },

  // Agent Reference (for multi-company agents)
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },

  // Company Admin (Primary Contact)
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Approval Status (for companies created by agents)
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Default to approved for admin-created companies
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  approvedAt: Date,
  rejectionReason: String,

  // Metadata
  notes: String,

}, {
  timestamps: true
});

// Indexes
companySchema.index({ email: 1 });
companySchema.index({ 'subscription.status': 1 });
companySchema.index({ isActive: 1 });

// Virtual for active workers count
companySchema.virtual('workersCount', {
  ref: 'workers',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Methods
companySchema.methods.isSubscriptionActive = function() {
  return this.subscription.status === 'active' &&
         (!this.subscription.endDate || this.subscription.endDate > new Date());
};

companySchema.methods.canAddWorker = function(currentWorkerCount) {
  return currentWorkerCount < this.subscription.maxWorkers;
};

// Statics
companySchema.statics.getActiveCompanies = function() {
  return this.find({
    isActive: true,
    'subscription.status': 'active'
  });
};

const Company = mongoose.model('companies', companySchema);

module.exports = Company;

