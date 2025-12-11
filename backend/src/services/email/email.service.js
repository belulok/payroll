const nodemailer = require('nodemailer');

class EmailService {
  constructor(app) {
    this.app = app;
    this.transporter = null;
  }

  // Initialize or update transporter with SMTP settings
  async initTransporter(smtpSettings = null) {
    if (!smtpSettings) {
      // Get settings from database
      try {
        const settingsService = this.app.service('system-settings');
        const settings = await settingsService.getByKey('main');
        smtpSettings = settings?.smtp;
      } catch (error) {
        console.error('Error fetching SMTP settings:', error.message);
        return null;
      }
    }

    if (!smtpSettings || !smtpSettings.host || !smtpSettings.user) {
      console.warn('SMTP settings not configured');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port || 465,
      secure: smtpSettings.secure !== false, // true for 465, false for other ports
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.password
      }
    });

    // Verify connection
    try {
      await this.transporter.verify();
      console.log('✅ Email transporter connected successfully');
      return this.transporter;
    } catch (error) {
      console.error('❌ Email transporter verification failed:', error.message);
      this.transporter = null;
      return null;
    }
  }

  // Send email
  async sendEmail(options) {
    if (!this.transporter) {
      await this.initTransporter();
    }

    if (!this.transporter) {
      throw new Error('Email service not configured. Please configure SMTP settings.');
    }

    // Get from settings
    const settingsService = this.app.service('system-settings');
    const settings = await settingsService.getByKey('main');
    const smtp = settings?.smtp || {};

    const mailOptions = {
      from: `"${smtp.fromName || 'Payroll System'}" <${smtp.fromEmail || 'nulong.services@gmail.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;
    if (options.attachments) mailOptions.attachments = options.attachments;

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      throw error;
    }
  }

  // Send document expiry reminder
  async sendDocumentExpiryReminder(document, worker, daysUntilExpiry, recipients) {
    const subject = `⚠️ Document Expiry Reminder: ${document.documentName} - ${worker.firstName} ${worker.lastName}`;

    const expiryDate = new Date(document.expiryDate).toLocaleDateString('en-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const documentTypeLabels = {
      'passport': 'Passport',
      'visa': 'Visa',
      'work-permit': 'Work Permit',
      'ic': 'IC / National ID',
      'driving-license': 'Driving License',
      'medical-certificate': 'Medical Certificate',
      'insurance': 'Insurance',
      'contract': 'Contract',
      'other': 'Document'
    };

    const docTypeLabel = documentTypeLabels[document.documentType] || 'Document';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .alert { background: ${daysUntilExpiry <= 3 ? '#FEE2E2' : daysUntilExpiry <= 7 ? '#FEF3C7' : '#DBEAFE'};
                   border-left: 4px solid ${daysUntilExpiry <= 3 ? '#EF4444' : daysUntilExpiry <= 7 ? '#F59E0B' : '#3B82F6'};
                   padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .label { color: #6b7280; font-size: 14px; }
          .value { font-weight: 600; color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px;
                 text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">📋 Document Expiry Reminder</h1>
          </div>
          <div class="content">
            <div class="alert">
              <strong>⚠️ ${daysUntilExpiry <= 0 ? 'EXPIRED' : `Expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`}</strong>
              <p style="margin: 5px 0 0 0;">The following document requires attention:</p>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="label">Worker</span>
                <span class="value">${worker.firstName} ${worker.lastName} (${worker.employeeId})</span>
              </div>
              <div class="detail-row">
                <span class="label">Document Type</span>
                <span class="value">${docTypeLabel}</span>
              </div>
              <div class="detail-row">
                <span class="label">Document Name</span>
                <span class="value">${document.documentName}</span>
              </div>
              ${document.documentNumber ? `
              <div class="detail-row">
                <span class="label">Document Number</span>
                <span class="value">${document.documentNumber}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Expiry Date</span>
                <span class="value" style="color: ${daysUntilExpiry <= 3 ? '#EF4444' : daysUntilExpiry <= 7 ? '#F59E0B' : '#3B82F6'};">
                  ${expiryDate}
                </span>
              </div>
            </div>

            <p>Please take necessary action to renew or update this document before it expires.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from Payroll System.</p>
            <p>© ${new Date().getFullYear()} Payroll System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Document Expiry Reminder

Worker: ${worker.firstName} ${worker.lastName} (${worker.employeeId})
Document Type: ${docTypeLabel}
Document Name: ${document.documentName}
${document.documentNumber ? `Document Number: ${document.documentNumber}` : ''}
Expiry Date: ${expiryDate}
Days Until Expiry: ${daysUntilExpiry}

Please take necessary action to renew or update this document before it expires.

This is an automated notification from Payroll System.
    `;

    return this.sendEmail({
      to: recipients.join(', '),
      subject,
      text,
      html
    });
  }

  // Test email configuration
  async testConnection(smtpSettings) {
    const testTransporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port || 465,
      secure: smtpSettings.secure !== false,
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.password
      }
    });

    try {
      await testTransporter.verify();
      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = function (app) {
  const emailService = new EmailService(app);

  // Attach to app for use by other services
  app.set('emailService', emailService);

  // Custom routes for email service
  app.post('/email/test-connection', async (req, res) => {
    try {
      const result = await emailService.testConnection(req.body.smtp);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/email/send', async (req, res) => {
    try {
      const result = await emailService.sendEmail(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/email/test-reminder', async (req, res) => {
    try {
      const { email, smtp } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required' });
      }

      // If SMTP settings are provided, use them directly (for testing before saving)
      let transporter;
      let fromEmail = 'nulong.services@gmail.com';
      let fromName = 'Payroll System';

      if (smtp && smtp.host && smtp.user && smtp.password) {
        // Use provided SMTP settings
        transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port || 465,
          secure: smtp.secure !== false,
          auth: {
            user: smtp.user,
            pass: smtp.password
          }
        });
        fromEmail = smtp.fromEmail || smtp.user;
        fromName = smtp.fromName || 'Payroll System';
      } else {
        // Try to use saved settings
        try {
          const settingsService = app.service('system-settings');
          const settings = await settingsService.getByKey('main');
          if (settings?.smtp?.host && settings?.smtp?.user && settings?.smtp?.password) {
            transporter = nodemailer.createTransport({
              host: settings.smtp.host,
              port: settings.smtp.port || 465,
              secure: settings.smtp.secure !== false,
              auth: {
                user: settings.smtp.user,
                pass: settings.smtp.password
              }
            });
            fromEmail = settings.smtp.fromEmail || settings.smtp.user;
            fromName = settings.smtp.fromName || 'Payroll System';
          }
        } catch (err) {
          console.error('Error fetching saved SMTP settings:', err.message);
        }
      }

      if (!transporter) {
        return res.status(400).json({
          success: false,
          message: 'SMTP settings not configured. Please fill in the SMTP settings and try again.'
        });
      }

      // Send test email
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .success { background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Email Test Successful</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>🎉 Congratulations!</strong>
                <p style="margin: 5px 0 0 0;">Your email configuration is working correctly.</p>
              </div>
              <p>This is a test email from your Payroll System to verify that the SMTP settings are configured correctly.</p>
              <p>You will now receive document expiry reminders and other notifications at this email address.</p>
            </div>
            <div class="footer">
              <p>Sent from Payroll System</p>
              <p>© ${new Date().getFullYear()} Payroll System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: '✅ Payroll System - Email Test Successful',
        text: 'This is a test email from Payroll System. Your email configuration is working correctly!',
        html: testHtml
      });

      console.log('📧 Test email sent:', info.messageId);
      res.json({ success: true, messageId: info.messageId, message: 'Test email sent successfully!' });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  });
};

