const createModel = require('../../models/project.model');
const { Projects } = require('./projects.class');
const hooks = require('./projects.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  app.use('/projects', new Projects(options, app));

  const service = app.service('projects');

  service.hooks(hooks);
};

