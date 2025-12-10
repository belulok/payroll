const createModel = require('../../models/worker-group.model');
const { WorkerGroups } = require('./worker-groups.class');
const hooks = require('./worker-groups.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/worker-groups', new WorkerGroups(options, app));

  const service = app.service('worker-groups');

  service.hooks(hooks);
};


