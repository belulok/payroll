const mongoose = require('mongoose');

const workerDocumentSchema = new mongoose.Schema({
  // Worker Reference
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'workers',
    required: true,
    index: true
  },

  // Company Reference (for multi-tenant filtering)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Document Type
  documentType: {
    type: String,
    enum: ['passport', 'visa', 'work-permit', 'ic', 'driving-license', 'medical-certificate', 'insurance', 'contract', 'other'],
    required: true
  },

  // Document Details
  documentNumber: {
    type: String,
    trim: true
  },

  documentName: {
    type: String,
    trim: true,
    required: true
  },

  // For passport/visa specific
  countryOfIssue: {
    type: String,
    trim: true
  },

  // Dates
  issueDate: {
    type: Date
  },

  expiryDate: {
    type: Date,
    index: true // Index for efficient reminder queries
  },

  // File attachment (URL or path)
  fileUrl: {
    type: String,
    trim: true
  },

  fileName: {
    type: String,
    trim: true
  },

  // Reminder Settings (individual document can override global settings)
  reminderEnabled: {
    type: Boolean,
    default: true
  },

  // Custom reminder days (if empty, use global settings)
  customReminderDays: [{
    type: Number // e.g., 30, 7, 3
  }],

  // Track sent reminders to avoid duplicates
  remindersSent: [{
    daysBeforeExpiry: Number,
    sentAt: Date,
    sentTo: [String] // email addresses
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'expiring-soon', 'archived'],
    default: 'active'
  },

  // Notes
  notes: {
    type: String,
    trim: true
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }

}, {
  timestamps: true
});

// Compound indexes
workerDocumentSchema.index({ company: 1, worker: 1 });
workerDocumentSchema.index({ company: 1, expiryDate: 1 });
workerDocumentSchema.index({ company: 1, status: 1 });
workerDocumentSchema.index({ expiryDate: 1, status: 1, reminderEnabled: 1 });

// Virtual to check if document is expiring
workerDocumentSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow && this.expiryDate > new Date();
});

// Virtual to check if document is expired
workerDocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Virtual for days until expiry
workerDocumentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(this.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save hook to update status based on expiry date
workerDocumentSchema.pre('save', function() {
  if (this.expiryDate) {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (this.expiryDate < today) {
      this.status = 'expired';
    } else if (this.expiryDate <= thirtyDaysFromNow) {
      this.status = 'expiring-soon';
    } else {
      this.status = 'active';
    }
  }
});

// Static method to find expiring documents
workerDocumentSchema.statics.findExpiring = function(daysFromNow, companyId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysFromNow);
  targetDate.setHours(23, 59, 59, 999);

  const query = {
    expiryDate: { $gte: today, $lte: targetDate },
    status: { $ne: 'archived' },
    reminderEnabled: true
  };

  if (companyId) {
    query.company = companyId;
  }

  return this.find(query)
    .populate('worker', 'firstName lastName email employeeId')
    .populate('company', 'name');
};

const WorkerDocument = mongoose.model('worker-documents', workerDocumentSchema);

module.exports = WorkerDocument;

