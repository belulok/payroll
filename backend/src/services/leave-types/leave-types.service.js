const createModel = require('../../models/leave-type.model');
const { LeaveTypes } = require('./leave-types.class');
const hooks = require('./leave-types.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/leave-types', new LeaveTypes(options, app));

  const service = app.service('leave-types');

  service.hooks(hooks);
};

