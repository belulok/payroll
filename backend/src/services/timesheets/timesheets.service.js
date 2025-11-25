const { Timesheets } = require('./timesheets.class');
const Timesheet = require('../../models/timesheet.model');
const hooks = require('./timesheets.hooks');

module.exports = function (app) {
  const options = {
    Model: Timesheet,
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/timesheets', new Timesheets(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('timesheets');

  // Register hooks
  service.hooks(hooks);

  // Add custom routes for approve/reject
  app.post('/timesheets/:id/approve', async (req, res) => {
    try {
      const result = await service.approve(req.params.id, {
        user: req.user,
        data: req.body
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/timesheets/:id/reject', async (req, res) => {
    try {
      const result = await service.reject(req.params.id, {
        user: req.user,
        data: req.body
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};

