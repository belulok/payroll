const createModel = require('../../models/client.model');
const { Clients } = require('./clients.class');
const hooks = require('./clients.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  app.use('/clients', new Clients(options, app));

  const service = app.service('clients');

  service.hooks(hooks);
};

