const { PayrollRecords } = require('./payroll-records.class');
const PayrollRecord = require('../../models/payroll-record.model');
const hooks = require('./payroll-records.hooks');

module.exports = function (app) {
  const options = {
    Model: PayrollRecord,
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/payroll-records', new PayrollRecords(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('payroll-records');

  // Register hooks
  service.hooks(hooks);

  // Custom route for generating payroll
  app.post('/payroll-records/generate', async (req, res) => {
    try {
      const { workerId, periodStart, periodEnd } = req.body;
      const result = await service.generatePayroll(workerId, periodStart, periodEnd, {
        user: req.user
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};
