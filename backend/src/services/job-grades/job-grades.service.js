const createModel = require('../../models/job-grade.model');
const { JobGrades } = require('./job-grades.class');
const hooks = require('./job-grades.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/job-grades', new JobGrades(options, app));

  const service = app.service('job-grades');

  service.hooks(hooks);
};

