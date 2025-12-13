const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Settings key (unique identifier)
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Company Reference (null = global settings, set = company-specific)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    default: null,
    index: true
  },

  // SMTP Email Configuration
  smtp: {
    host: {
      type: String,
      trim: true
    },
    port: {
      type: Number,
      default: 465
    },
    secure: {
      type: Boolean,
      default: true // true for 465, false for other ports
    },
    user: {
      type: String,
      trim: true
    },
    // Password stored encrypted in production
    password: {
      type: String,
      trim: true
    },
    fromEmail: {
      type: String,
      trim: true,
      default: 'nulong.services@gmail.com'
    },
    fromName: {
      type: String,
      trim: true,
      default: 'Payroll System'
    }
  },

  // Document Reminder Settings
  documentReminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    // Days before expiry to send reminders
    reminderDays: [{
      type: Number
    }],
    // Default: [30, 7, 3] for 1 month, 1 week, 3 days

    // Time of day to send reminders (24h format)
    reminderTime: {
      type: String,
      default: '09:00' // 9 AM
    },

    // Include in-app notifications
    inAppNotifications: {
      type: Boolean,
      default: true
    },

    // Include email notifications
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },

  // Notification Recipients
  notificationRecipients: [{
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true
    },
    // Types of notifications to receive
    notificationTypes: [{
      type: String,
      enum: ['document-expiry', 'payroll', 'timesheet', 'leave', 'all']
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // General notification settings
  notifications: {
    // Notification for various events
    timesheetReminders: {
      type: Boolean,
      default: true
    },
    payrollGenerated: {
      type: Boolean,
      default: true
    },
    leaveRequests: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users'
  }

}, {
  timestamps: true
});

// Compound index for company-specific settings
systemSettingsSchema.index({ key: 1, company: 1 }, { unique: true });

// Static method to get settings (with fallback to global)
systemSettingsSchema.statics.getSettings = async function(key, companyId = null) {
  // Try company-specific settings first
  if (companyId) {
    const companySettings = await this.findOne({ key, company: companyId });
    if (companySettings) return companySettings;
  }

  // Fall back to global settings
  return this.findOne({ key, company: null });
};

// Static method to get or create default settings
systemSettingsSchema.statics.getOrCreateDefault = async function(key, companyId = null) {
  let settings = await this.getSettings(key, companyId);

  if (!settings) {
    // Create default settings
    settings = await this.create({
      key,
      company: companyId,
      documentReminders: {
        enabled: true,
        reminderDays: [30, 7, 3], // 1 month, 1 week, 3 days
        reminderTime: '09:00',
        inAppNotifications: true,
        emailNotifications: true
      },
      smtp: {
        host: '',
        port: 465,
        secure: true,
        user: '',
        password: '',
        fromEmail: 'nulong.services@gmail.com',
        fromName: 'Payroll System'
      },
      notificationRecipients: [],
      notifications: {
        timesheetReminders: true,
        payrollGenerated: true,
        leaveRequests: true
      }
    });
  }

  return settings;
};

const SystemSettings = mongoose.model('system-settings', systemSettingsSchema);

module.exports = SystemSettings;



