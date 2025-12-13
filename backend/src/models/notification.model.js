const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },
  // Target user (if null, it's for all users in company)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    index: true
  },
  // Notification type
  type: {
    type: String,
    enum: [
      'document_expiry',
      'timesheet_reminder',
      'timesheet_approved',
      'timesheet_rejected',
      'payroll_generated',
      'leave_request',
      'leave_approved',
      'leave_rejected',
      'system',
      'info'
    ],
    required: true
  },
  // Title of notification
  title: {
    type: String,
    required: true,
    trim: true
  },
  // Message body
  message: {
    type: String,
    required: true
  },
  // Related entity (for linking)
  relatedEntity: {
    type: {
      type: String,
      enum: ['worker', 'timesheet', 'payroll', 'leave', 'document', 'invoice']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Read status per user
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Email sent status
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  // Expiry (auto-delete old notifications)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ company: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ 'readBy.user': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('notifications', notificationSchema);



