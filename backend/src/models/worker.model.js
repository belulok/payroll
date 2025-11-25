const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Personal Information
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  phone: {
    type: String,
    trim: true
  },

  // Identification
  icNumber: {
    type: String,
    trim: true
  },
  passportNumber: {
    type: String,
    trim: true
  },

  // Employment Details
  position: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  terminationDate: Date,
  employmentStatus: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'suspended'],
    default: 'active'
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'temporary'],
    default: 'full-time'
  },

  // Payment Type
  paymentType: {
    type: String,
    enum: ['monthly-salary', 'hourly', 'unit-based'],
    required: true,
    default: 'monthly-salary'
  },

  // Leave Tier (for monthly-salary type)
  leaveTier: {
    type: String,
    trim: true
  },

  // Payroll Information
  payrollInfo: {
    // Monthly Salary
    monthlySalary: {
      type: Number,
      default: 0
    },

    // Hourly Rate
    hourlyRate: {
      type: Number,
      default: 0
    },

    // Unit-based Rate
    unitRates: [{
      unitType: String,
      ratePerUnit: Number
    }],

    currency: {
      type: String,
      default: 'MYR'
    },
    bankName: String,
    bankAccountNumber: String,
    bankAccountName: String,

    // Malaysian Statutory
    epfNumber: String,
    socsoNumber: String,
    eisNumber: String,
    taxNumber: String,

    // Allowances
    allowances: [{
      name: String,
      amount: Number,
      type: { type: String, enum: ['fixed', 'percentage'] }
    }],

    // Deductions
    deductions: [{
      name: String,
      amount: Number,
      type: { type: String, enum: ['fixed', 'percentage'] }
    }]
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    postcode: String,
    country: { type: String, default: 'Malaysia' }
  },

  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },

  // Documents (file paths or URLs)
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],

  // User Account Reference (if worker has login access)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
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

// Compound indexes for multi-tenancy
workerSchema.index({ company: 1, employeeId: 1 }, { unique: true });
workerSchema.index({ company: 1, isActive: 1 });
workerSchema.index({ company: 1, employmentStatus: 1 });

// Virtual for full name
workerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
workerSchema.methods.isActiveWorker = function() {
  return this.isActive && this.employmentStatus === 'active';
};

// Statics
workerSchema.statics.getActiveWorkersByCompany = function(companyId) {
  return this.find({
    company: companyId,
    isActive: true,
    employmentStatus: 'active'
  });
};

const Worker = mongoose.model('workers', workerSchema);

module.exports = Worker;

