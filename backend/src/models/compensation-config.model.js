const mongoose = require('mongoose');

// Benefits configuration for a group or job band
const benefitConfigSchema = new mongoose.Schema({
  // Configuration type - group takes priority over band
  configType: {
    type: String,
    enum: ['group', 'band'],
    default: 'band'
  },

  // Group reference (if configType is 'group')
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'worker-groups'
  },
  groupName: String, // Denormalized for quick access

  // Job Band reference (if configType is 'band')
  jobBand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'job-bands'
  },
  jobBandName: String, // Denormalized for quick access

  // Dynamic Leave Entitlements
  leaveEntitlements: [{
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      uppercase: true,
      maxLength: 4
    },
    daysPerYear: {
      type: Number,
      default: 0,
      min: 0
    },
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
    description: String
  }],

  // Legacy Leave Entitlements (for backward compatibility)
  annualLeave: {
    type: Number,
    default: 0,
    min: 0
  },
  sickLeave: {
    type: Number,
    default: 0,
    min: 0
  },

  // Other Benefits
  benefits: [{
    name: String,
    description: String,
    value: Number,
    type: { type: String, enum: ['fixed', 'percentage'] }
  }]
}, { _id: false });

// Deduction configuration for a group or job band
const deductionConfigSchema = new mongoose.Schema({
  // Configuration type - group takes priority over band
  configType: {
    type: String,
    enum: ['group', 'band'],
    default: 'band'
  },

  // Group reference (if configType is 'group')
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'worker-groups'
  },
  groupName: String, // Denormalized for quick access

  // Job Band reference (if configType is 'band')
  jobBand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'job-bands'
  },
  jobBandName: String, // Denormalized for quick access

  // Statutory Deductions - EPF
  epfEnabled: {
    type: Boolean,
    default: true
  },
  epfEmployeeRate: {
    type: Number,
    default: 11, // Default 11% employee contribution
    min: 0,
    max: 100
  },
  epfEmployerRate: {
    type: Number,
    default: 12, // Default 12% employer contribution
    min: 0,
    max: 100
  },

  // Statutory Deductions - SOCSO
  socsoEnabled: {
    type: Boolean,
    default: true
  },
  socsoEmployeeRate: {
    type: Number,
    default: 0.5, // Default 0.5% employee contribution
    min: 0,
    max: 100
  },
  socsoEmployerRate: {
    type: Number,
    default: 1.75, // Default 1.75% employer contribution
    min: 0,
    max: 100
  },

  // Statutory Deductions - EIS
  eisEnabled: {
    type: Boolean,
    default: true
  },
  eisEmployeeRate: {
    type: Number,
    default: 0.2, // Default 0.2% employee contribution
    min: 0,
    max: 100
  },
  eisEmployerRate: {
    type: Number,
    default: 0.2, // Default 0.2% employer contribution
    min: 0,
    max: 100
  },

  // Custom Deductions
  customDeductions: [{
    name: String,
    description: String,
    amount: Number,
    type: { type: String, enum: ['fixed', 'percentage'] }
  }]
}, { _id: false });

// Client billing rate configuration
const clientRateConfigSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  clientName: String, // Denormalized for quick access

  // Position-based rates
  positionRates: [{
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'positions',
      required: true
    },
    positionTitle: String, // Denormalized for quick access
    normalRate: {
      type: Number,
      default: 0,
      min: 0
    },
    otRate: {
      type: Number,
      default: 0,
      min: 0
    },
    sundayRate: {
      type: Number,
      default: 0,
      min: 0
    },
    phRate: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'MYR'
    }
  }]
}, { _id: false });

// Main Compensation Configuration Schema
const compensationConfigSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    unique: true,
    index: true
  },

  // Benefits by Job Band
  benefitConfigs: [benefitConfigSchema],

  // Deductions by Job Band
  deductionConfigs: [deductionConfigSchema],

  // Client Billing Rates
  clientRateConfigs: [clientRateConfigSchema],

  // Metadata
  notes: String,

}, {
  timestamps: true
});

// Indexes
compensationConfigSchema.index({ company: 1 });

const CompensationConfig = mongoose.model('compensation-configs', compensationConfigSchema);

module.exports = CompensationConfig;

