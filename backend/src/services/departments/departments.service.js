const createModel = require('../../models/department.model');
const { Departments } = require('./departments.class');
const hooks = require('./departments.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/departments', new Departments(options, app));

  const service = app.service('departments');

  service.hooks(hooks);
};

