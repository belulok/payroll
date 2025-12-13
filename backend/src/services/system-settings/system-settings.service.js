const { SystemSettings } = require('./system-settings.class');
const SystemSettingsModel = require('../../models/system-settings.model');
const hooks = require('./system-settings.hooks');

module.exports = function (app) {
  const options = {
    Model: SystemSettingsModel,
    paginate: app.get('paginate'),
    whitelist: ['$populate']
  };

  // Initialize our service with any options it requires
  app.use('/system-settings', new SystemSettings(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('system-settings');

  // Register hooks
  service.hooks(hooks);

  // Custom route for getting settings by key
  app.get('/system-settings/by-key/:key', async (req, res) => {
    try {
      const companyId = req.query.company || null;
      const result = await service.getByKey(req.params.key, companyId);

      if (!result) {
        // Create and return default
        const defaultSettings = await service.getOrCreateDefault(req.params.key, companyId);
        return res.json(defaultSettings);
      }

      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Custom route for updating SMTP settings
  app.patch('/system-settings/smtp/:key', async (req, res) => {
    try {
      const companyId = req.body.company || null;
      const result = await service.updateSmtp(req.params.key, req.body.smtp, companyId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Custom route for managing recipients
  app.post('/system-settings/:key/recipients', async (req, res) => {
    try {
      const companyId = req.body.company || null;
      const result = await service.addRecipient(req.params.key, req.body.recipient, companyId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/system-settings/:key/recipients/:email', async (req, res) => {
    try {
      const companyId = req.query.company || null;
      const result = await service.removeRecipient(req.params.key, req.params.email, companyId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};



