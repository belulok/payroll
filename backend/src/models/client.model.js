const mongoose = require('mongoose');

// Custom holiday schema for client-specific holidays
const customHolidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['public', 'company', 'custom'], default: 'custom' },
  isPaid: { type: Boolean, default: true },
  description: String
}, { _id: true });

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Primary company that created this client
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // All companies that have access to this client (for multi-company support)
  companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  // User account for client login
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postcode: String,
    country: { type: String, default: 'Malaysia' }
  },

  // Timesheet & Attendance Settings
  timesheetSettings: {
    // Minute increment for recording (1, 5, 6, 10, 15, 30, 60 minutes)
    minuteIncrement: {
      type: Number,
      enum: [1, 5, 6, 10, 15, 30, 60],
      default: 30
    },
    // How to round the hours
    roundingMethod: {
      type: String,
      enum: ['nearest', 'up', 'down'],
      default: 'nearest'
    },
    // Minimum hours per day
    minHoursPerDay: {
      type: Number,
      default: 0
    },
    // Maximum hours per day
    maxHoursPerDay: {
      type: Number,
      default: 24
    },
    // Allow overtime recording
    allowOvertime: {
      type: Boolean,
      default: true
    },
    // Maximum OT hours per day
    maxOTHoursPerDay: {
      type: Number,
      default: 4
    },
    // Rate multipliers (client can set these, but not actual rates)
    sundayMultiplier: {
      type: Number,
      default: 1.5
    },
    phMultiplier: {
      type: Number,
      default: 2.0
    }
  },

  // Client's custom holidays (in addition to company holidays)
  customHolidays: [customHolidaySchema],

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
clientSchema.index({ company: 1, name: 1 });
clientSchema.index({ company: 1, isActive: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ companies: 1 });

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  return mongooseClient.model('Client', clientSchema);
};

