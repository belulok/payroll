const cron = require('node-cron');

class DocumentReminderService {
  constructor(app) {
    this.app = app;
    this.cronJob = null;
  }

  // Start the reminder cron job
  start() {
    // Run every day at 9 AM
    this.cronJob = cron.schedule('0 9 * * *', async () => {
      console.log('🔔 Running document expiry reminder check...');
      await this.checkAndSendReminders();
    });

    console.log('📅 Document reminder cron job scheduled (daily at 9 AM)');
  }

  // Stop the cron job
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Document reminder cron job stopped');
    }
  }

  // Check for expiring documents and send reminders
  async checkAndSendReminders() {
    try {
      const settingsService = this.app.service('system-settings');
      const documentsService = this.app.service('worker-documents');
      const emailService = this.app.get('emailService');

      // Get reminder settings
      const settings = await settingsService.getByKey('main');

      if (!settings || !settings.documentReminders?.enabled) {
        console.log('Document reminders are disabled');
        return;
      }

      const reminderDays = settings.documentReminders?.reminderDays || [30, 7, 3];
      const recipients = (settings.notificationRecipients || [])
        .filter(r => r.isActive && (r.notificationTypes?.includes('document-expiry') || r.notificationTypes?.includes('all')))
        .map(r => r.email);

      if (recipients.length === 0) {
        console.log('No notification recipients configured for document expiry');
        return;
      }

      console.log(`Checking for documents expiring in ${reminderDays.join(', ')} days...`);
      console.log(`Recipients: ${recipients.join(', ')}`);

      // Check each reminder day
      for (const days of reminderDays) {
        await this.sendRemindersForDay(days, documentsService, emailService, recipients);
      }

    } catch (error) {
      console.error('Error in document reminder check:', error.message);
    }
  }

  // Send reminders for a specific day threshold
  async sendRemindersForDay(days, documentsService, emailService, recipients) {
    try {
      // Get documents expiring exactly on this day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);

      // Find documents expiring on this exact day
      const documents = await documentsService.find({
        query: {
          expiryDate: {
            $gte: targetDate,
            $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // Next day
          },
          status: { $ne: 'archived' },
          reminderEnabled: true
        },
        paginate: false
      });

      if (!documents || documents.length === 0) {
        return;
      }

      console.log(`Found ${documents.length} document(s) expiring in ${days} day(s)`);

      for (const doc of documents) {
        // Check if reminder was already sent for this threshold
        const alreadySent = (doc.remindersSent || []).some(
          r => r.daysBeforeExpiry === days
        );

        if (alreadySent) {
          console.log(`Reminder for ${days} days already sent for document ${doc._id}`);
          continue;
        }

        // Get worker info
        let worker = doc.worker;
        if (typeof worker === 'string') {
          try {
            worker = await this.app.service('workers').get(worker);
          } catch (e) {
            console.error(`Error fetching worker for document ${doc._id}:`, e.message);
            continue;
          }
        }

        // Determine recipients (use document custom or global)
        const docRecipients = doc.customRecipients?.length > 0
          ? doc.customRecipients
          : recipients;

        // Include worker's email if available
        if (worker.email && !docRecipients.includes(worker.email)) {
          // Optionally add worker's email
          // docRecipients.push(worker.email);
        }

        // Send reminder email
        try {
          await emailService.sendDocumentExpiryReminder(
            doc,
            worker,
            days,
            docRecipients
          );

          // Record that reminder was sent
          const remindersSent = doc.remindersSent || [];
          remindersSent.push({
            daysBeforeExpiry: days,
            sentAt: new Date(),
            sentTo: docRecipients
          });

          await documentsService.patch(doc._id, {
            remindersSent
          }, { provider: undefined }); // Internal call

          console.log(`✅ Sent ${days}-day reminder for document ${doc._id}`);
        } catch (emailError) {
          console.error(`❌ Error sending reminder for document ${doc._id}:`, emailError.message);
        }
      }
    } catch (error) {
      console.error(`Error sending reminders for ${days} days:`, error.message);
    }
  }

  // Manual trigger for testing
  async triggerReminders() {
    console.log('🔔 Manually triggering document reminders...');
    await this.checkAndSendReminders();
    return { success: true, message: 'Reminder check completed' };
  }

  // Get upcoming expirations summary
  async getExpirationsSummary() {
    const documentsService = this.app.service('worker-documents');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      expired: [],
      expiring3Days: [],
      expiring7Days: [],
      expiring30Days: []
    };

    // Expired documents
    summary.expired = await documentsService.find({
      query: {
        expiryDate: { $lt: today },
        status: { $ne: 'archived' }
      },
      paginate: false
    });

    // Expiring in 3 days
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    summary.expiring3Days = await documentsService.find({
      query: {
        expiryDate: { $gte: today, $lte: threeDays },
        status: { $ne: 'archived' }
      },
      paginate: false
    });

    // Expiring in 7 days
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);
    summary.expiring7Days = await documentsService.find({
      query: {
        expiryDate: { $gte: today, $lte: sevenDays },
        status: { $ne: 'archived' }
      },
      paginate: false
    });

    // Expiring in 30 days
    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    summary.expiring30Days = await documentsService.find({
      query: {
        expiryDate: { $gte: today, $lte: thirtyDays },
        status: { $ne: 'archived' }
      },
      paginate: false
    });

    return {
      expiredCount: summary.expired.length,
      expiring3DaysCount: summary.expiring3Days.length,
      expiring7DaysCount: summary.expiring7Days.length,
      expiring30DaysCount: summary.expiring30Days.length,
      ...summary
    };
  }
}

module.exports = function (app) {
  const reminderService = new DocumentReminderService(app);

  // Start the cron job
  reminderService.start();

  // Attach to app for use by other services
  app.set('documentReminderService', reminderService);

  // Custom routes
  app.post('/document-reminders/trigger', async (req, res) => {
    try {
      const result = await reminderService.triggerReminders();
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/document-reminders/summary', async (req, res) => {
    try {
      const result = await reminderService.getExpirationsSummary();
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
};


