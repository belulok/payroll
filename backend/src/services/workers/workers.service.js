const { Workers } = require('./workers.class');
const Worker = require('../../models/worker.model');
const hooks = require('./workers.hooks');

module.exports = function (app) {
  const options = {
    Model: Worker,
    paginate: app.get('paginate'),
    whitelist: ['$populate']
  };

  // Initialize our service with any options it requires
  app.use('/workers', new Workers(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('workers');

  // Register hooks
  service.hooks(hooks);

  // Custom route for bulk import
  app.post('/workers/bulk-import', async (req, res) => {
    try {
      const result = await service.bulkImport(req.body.workers, {
        user: req.user
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};

