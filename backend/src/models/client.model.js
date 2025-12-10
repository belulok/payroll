const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
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
    }
  },

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

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  return mongooseClient.model('Client', clientSchema);
};

