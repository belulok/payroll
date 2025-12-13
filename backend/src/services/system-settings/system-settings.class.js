const { Service } = require('feathers-mongoose');

class SystemSettings extends Service {
  constructor(options, app) {
    super(options, app);
    this.app = app;
  }

  // Override find to filter by company if needed
  async find(params) {
    // Admin can see all, others see only their company's settings
    if (params.user && params.user.role !== 'admin' && params.user.role !== 'agent') {
      params.query = params.query || {};
      params.query.$or = [
        { company: null }, // Global settings
        { company: params.user.company } // Company-specific
      ];
    }
    return super.find(params);
  }

  // Get settings by key
  async getByKey(key, companyId = null) {
    const query = { key };

    if (companyId) {
      // Try company-specific first
      const companySettings = await this.find({
        query: { key, company: companyId },
        paginate: false
      });
      if (companySettings.length > 0) {
        return companySettings[0];
      }
    }

    // Fall back to global
    const globalSettings = await this.find({
      query: { key, company: null },
      paginate: false
    });

    return globalSettings.length > 0 ? globalSettings[0] : null;
  }

  // Get or create default settings
  async getOrCreateDefault(key, companyId = null) {
    let settings = await this.getByKey(key, companyId);

    if (!settings) {
      // Create default settings
      settings = await this.create({
        key,
        company: companyId,
        documentReminders: {
          enabled: true,
          reminderDays: [30, 7, 3],
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
  }

  // Update SMTP settings
  async updateSmtp(key, smtpData, companyId = null) {
    const settings = await this.getOrCreateDefault(key, companyId);
    return this.patch(settings._id, {
      smtp: { ...settings.smtp, ...smtpData }
    });
  }

  // Update document reminder settings
  async updateDocumentReminders(key, reminderData, companyId = null) {
    const settings = await this.getOrCreateDefault(key, companyId);
    return this.patch(settings._id, {
      documentReminders: { ...settings.documentReminders, ...reminderData }
    });
  }

  // Add notification recipient
  async addRecipient(key, recipientData, companyId = null) {
    const settings = await this.getOrCreateDefault(key, companyId);
    const recipients = settings.notificationRecipients || [];

    // Check if email already exists
    const exists = recipients.find(r => r.email === recipientData.email);
    if (exists) {
      throw new Error('Recipient with this email already exists');
    }

    recipients.push({
      ...recipientData,
      isActive: true
    });

    return this.patch(settings._id, {
      notificationRecipients: recipients
    });
  }

  // Remove notification recipient
  async removeRecipient(key, email, companyId = null) {
    const settings = await this.getOrCreateDefault(key, companyId);
    const recipients = (settings.notificationRecipients || [])
      .filter(r => r.email !== email);

    return this.patch(settings._id, {
      notificationRecipients: recipients
    });
  }
}

exports.SystemSettings = SystemSettings;



