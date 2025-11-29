const createModel = require('../../models/position.model');
const { Positions } = require('./positions.class');
const hooks = require('./positions.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/positions', new Positions(options, app));

  const service = app.service('positions');

  service.hooks(hooks);
};

