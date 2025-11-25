const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  basicSalary: {
    type: Number,
    required: true
  },
  allowances: {
    housing: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    meal: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  deductions: {
    tax: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    pension: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  bonus: {
    type: Number,
    default: 0
  },
  grossPay: {
    type: Number,
    required: true
  },
  netPay: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'paid', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  approvedAt: Date,
  paidAt: Date,
  notes: String
}, {
  timestamps: true
});

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const payroll = mongooseClient.model('payroll', payrollSchema);

  return payroll;
};

