const createModel = require('../../models/task.model');
const { Tasks } = require('./tasks.class');
const hooks = require('./tasks.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/tasks', new Tasks(options, app));

  const service = app.service('tasks');

  service.hooks(hooks);
};
