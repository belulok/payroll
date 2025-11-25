const { Payroll } = require('./payroll.class');
const createModel = require('../../models/payroll.model');
const hooks = require('./payroll.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  app.use('/payroll', new Payroll(options, app));

  const service = app.service('payroll');

  service.hooks(hooks);
};

