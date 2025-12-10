const mongoose = require('mongoose');

// Installment schema for tracking monthly deductions
const installmentSchema = new mongoose.Schema({
  installmentNumber: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  paidAt: Date,
  payrollRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'payroll-records'
  }
}, {
  timestamps: true
});

const loanSchema = new mongoose.Schema({
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

  // Loan Information
  loanId: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['loan', 'advance'],
    default: 'advance',
    required: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Percentage
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'MYR'
  },

  // Repayment Configuration
  hasInstallments: {
    type: Boolean,
    default: false
  },
  installmentType: {
    type: String,
    enum: ['fixed_amount', 'fixed_count'],
    default: 'fixed_amount'
  },
  installmentAmount: {
    type: Number,
    min: 0
  },
  installmentCount: {
    type: Number,
    min: 1
  },
  installments: [installmentSchema],

  // Loan Status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'defaulted'],
    default: 'active',
    index: true
  },

  // Dates
  loanDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  startDate: {
    type: Date,
    required: true
  },
  expectedEndDate: Date,
  completedAt: Date,

  // Tracking
  totalPaidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Audit
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
  description: String,
  notes: String

}, {
  timestamps: true
});

// Compound indexes
loanSchema.index({ company: 1, loanId: 1 }, { unique: true });
loanSchema.index({ company: 1, worker: 1 });
loanSchema.index({ company: 1, status: 1 });
loanSchema.index({ worker: 1, status: 1 });
loanSchema.index({ company: 1, category: 1 });

// Virtual for outstanding balance
loanSchema.virtual('outstandingBalance').get(function() {
  return this.totalAmount - this.totalPaidAmount;
});

// Methods
loanSchema.methods.calculateTotalAmount = function() {
  if (this.interestRate > 0) {
    this.totalAmount = this.principalAmount * (1 + this.interestRate / 100);
  } else {
    this.totalAmount = this.principalAmount;
  }
  this.remainingAmount = this.totalAmount;
  return this.totalAmount;
};

loanSchema.methods.generateInstallments = function() {
  if (!this.hasInstallments) return;

  this.installments = [];
  let remainingAmount = this.totalAmount;
  let installmentCount = 0;
  let installmentAmount = 0;

  if (this.installmentType === 'fixed_count') {
    installmentCount = this.installmentCount;
    installmentAmount = Math.round((this.totalAmount / this.installmentCount) * 100) / 100;
  } else {
    installmentAmount = this.installmentAmount;
    installmentCount = Math.ceil(this.totalAmount / this.installmentAmount);
  }

  const startDate = new Date(this.startDate);

  for (let i = 1; i <= installmentCount; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const amount = i === installmentCount ? remainingAmount : installmentAmount;
    remainingAmount -= amount;

    this.installments.push({
      installmentNumber: i,
      dueDate: dueDate,
      amount: Math.round(amount * 100) / 100
    });
  }
};

const Loan = mongoose.model('loans', loanSchema);

module.exports = Loan;
