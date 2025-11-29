const createService = require('feathers-mongoose');
const createModel = require('../../models/invoice.model');
const hooks = require('./invoices.hooks');
const InvoicesService = require('./invoices.class');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate'),
    whitelist: ['$populate', '$regex', '$options']
  };

  // Initialize our service with any options it requires
  app.use('/invoices', new InvoicesService(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('invoices');

  // Add custom method for generating invoices
  app.use('/invoices/generate', {
    async create(data, params) {
      const invoicesService = app.service('invoices');
      return await invoicesService.generateInvoice(data, params);
    }
  });

  service.hooks(hooks);
};
