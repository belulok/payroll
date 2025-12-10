const createModel = require('../../models/compensation-config.model');
const { CompensationConfigs } = require('./compensation-configs.class');
const hooks = require('./compensation-configs.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/compensation-configs', new CompensationConfigs(options, app));

  const service = app.service('compensation-configs');

  service.hooks(hooks);
};

