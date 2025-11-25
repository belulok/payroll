const mongoose = require('mongoose');

// Daily entry schema for each day in the week
const dailyEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    required: true
  },
  clockIn: Date,
  clockOut: Date,
  // Optional lunch break tracking
  lunchOut: Date,
  lunchIn: Date,
  normalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  ot1_5Hours: {
    type: Number,
    default: 0,
    min: 0
  },
  ot2_0Hours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  checkInMethod: {
    type: String,
    enum: ['manual', 'qr-code', 'gps', 'photo'],
    default: 'manual'
  },
  qrCodeCheckIn: {
    scanned: { type: Boolean, default: false },
    scannedAt: Date,
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    qrCodeData: String
  },
  qrCodeCheckOut: {
    scanned: { type: Boolean, default: false },
    scannedAt: Date,
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    qrCodeData: String
  },
  location: {
    clockIn: {
      latitude: Number,
      longitude: Number,
      address: String,
      timestamp: Date
    },
    clockOut: {
      latitude: Number,
      longitude: Number,
      address: String,
      timestamp: Date
    }
  },
  notes: String,
  isAbsent: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const timesheetSchema = new mongoose.Schema({
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

  // Week information
  weekStartDate: {
    type: Date,
    required: true,
    index: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },

  // Daily entries (Mon-Fri)
  dailyEntries: [dailyEntrySchema],

  // Week totals
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

  // Attendance proof (optional)
  attachments: [{
    type: {
      type: String,
      enum: ['photo', 'qr_code', 'document']
    },
    url: String,
    uploadedAt: Date
  }],

  // Manual Edit Tracking
  manuallyEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    editedAt: { type: Date, default: Date.now },
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String
  }],

  // Project/Site information
  project: {
    name: String,
    code: String,
    location: String
  },

  // Work description
  description: String,
  notes: String,

  // Approval workflow
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved_subcon', 'approved_admin', 'rejected', 'cancelled'],
    default: 'draft',
    required: true,
    index: true
  },

  approvalHistory: [{
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    role: {
      type: String,
      enum: ['subcon-admin', 'admin']
    },
    status: {
      type: String,
      enum: ['approved', 'rejected']
    },
    comments: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },

  // Flags
  isConflict: {
    type: Boolean,
    default: false
  },
  conflictWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'timesheets'
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Compound indexes for efficient queries
timesheetSchema.index({ company: 1, worker: 1, date: 1 });
timesheetSchema.index({ company: 1, status: 1, date: -1 });
timesheetSchema.index({ worker: 1, date: 1, clockIn: 1, clockOut: 1 });

// Virtual for duration in minutes
timesheetSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.clockOut - this.clockIn) / (1000 * 60));
});

// Method to check if timesheet overlaps with another
timesheetSchema.methods.overlapsWith = function(otherTimesheet) {
  return (
    this.worker.toString() === otherTimesheet.worker.toString() &&
    this.date.toDateString() === otherTimesheet.date.toDateString() &&
    (
      (this.clockIn >= otherTimesheet.clockIn && this.clockIn < otherTimesheet.clockOut) ||
      (this.clockOut > otherTimesheet.clockIn && this.clockOut <= otherTimesheet.clockOut) ||
      (this.clockIn <= otherTimesheet.clockIn && this.clockOut >= otherTimesheet.clockOut)
    )
  );
};

// Static method to find conflicts
timesheetSchema.statics.findConflicts = async function(workerId, date, clockIn, clockOut, excludeId = null) {
  const query = {
    worker: workerId,
    date: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    },
    isDeleted: false,
    $or: [
      { clockIn: { $gte: clockIn, $lt: clockOut } },
      { clockOut: { $gt: clockIn, $lte: clockOut } },
      { clockIn: { $lte: clockIn }, clockOut: { $gte: clockOut } }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

const Timesheet = mongoose.model('timesheets', timesheetSchema);

module.exports = Timesheet;

