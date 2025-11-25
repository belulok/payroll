const mongoose = require('mongoose');

const payrollRecordSchema = new mongoose.Schema({
  // Multi-tenant references
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

  // Period information
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true,
    index: true
  },
  paymentDate: Date,

  // Payment Type
  paymentType: {
    type: String,
    enum: ['monthly-salary', 'hourly', 'unit-based'],
    default: 'hourly'
  },

  // Timesheets included (for hourly payment type)
  timesheets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'timesheets'
  }],

  // Unit records included (for unit-based payment type)
  unitRecords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'unit-records'
  }],

  // Unit summary (for unit-based payment type)
  unitSummary: mongoose.Schema.Types.Mixed,

  // Monthly salary fields (for monthly-salary payment type)
  monthlySalary: Number,
  baseSalary: Number,
  workingDays: Number,
  paidLeaveDays: Number,
  unpaidLeaveDays: Number,
  actualWorkingDays: Number,

  // Hours breakdown
  totalNormalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOT1_5Hours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOT2_0Hours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },

  // Rate information
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  ot1_5Rate: Number,
  ot2_0Rate: Number,

  // Gross pay calculation
  normalPay: {
    type: Number,
    default: 0,
    min: 0
  },
  ot1_5Pay: {
    type: Number,
    default: 0,
    min: 0
  },
  ot2_0Pay: {
    type: Number,
    default: 0,
    min: 0
  },
  grossPay: {
    type: Number,
    default: 0,
    min: 0
  },

  // Allowances
  allowances: [{
    name: String,
    amount: Number,
    type: {
      type: String,
      enum: ['fixed', 'percentage']
    }
  }],
  totalAllowances: {
    type: Number,
    default: 0,
    min: 0
  },

  // Malaysian Statutory Deductions
  epf: {
    employeeContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    employerContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    totalContribution: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  socso: {
    employeeContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    employerContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    totalContribution: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  eis: {
    employeeContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    employerContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    totalContribution: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Other deductions
  deductions: [{
    name: String,
    amount: Number,
    type: {
      type: String,
      enum: ['fixed', 'percentage']
    }
  }],
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0
  },

  // Net pay
  netPay: {
    type: Number,
    default: 0
  },

  // Payment information
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'e-wallet']
  },
  paymentReference: String,
  paidAt: Date,

  // Bank details (from worker record)
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },

  // Payslip
  payslipUrl: String,
  payslipGeneratedAt: Date,

  // Status and flags
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid', 'cancelled'],
    default: 'draft',
    index: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },

  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  approvedAt: Date,

  // Notes
  notes: String,
  internalNotes: String

}, {
  timestamps: true
});

// Compound indexes
payrollRecordSchema.index({ company: 1, worker: 1, periodStart: 1, periodEnd: 1 });
payrollRecordSchema.index({ company: 1, status: 1, periodStart: -1 });
payrollRecordSchema.index({ worker: 1, periodStart: -1 });

const PayrollRecord = mongoose.model('payroll_records', payrollRecordSchema);

module.exports = PayrollRecord;

