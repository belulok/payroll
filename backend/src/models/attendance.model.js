const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'workers',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  clockIn: {
    type: Date
  },
  clockOut: {
    type: Date
  },
  lunchOut: {
    type: Date
  },
  lunchIn: {
    type: Date
  },
  checkInMethod: {
    type: String,
    enum: ['manual', 'qr-code', 'biometric', 'mobile'],
    default: 'manual'
  },
  qrCodeData: {
    type: String
  },
  location: {
    lat: Number,
    lng: Number,
    accuracy: Number
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'leave'],
    default: 'present'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });
attendanceSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('attendance', attendanceSchema);



