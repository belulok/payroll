const createModel = require('../../models/loan.model');
const { Loans } = require('./loans.class');
const hooks = require('./loans.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate'),
    whitelist: ['$populate', '$regex', '$options']
  };

  app.use('/loans', new Loans(options, app));

  const service = app.service('loans');

  service.hooks(hooks);

  // Custom method for recording payments
  service.methods = {
    ...service.methods,
    recordPayment: async function(id, data, params) {
      return await this.recordPayment(id, data, params);
    }
  };
};
