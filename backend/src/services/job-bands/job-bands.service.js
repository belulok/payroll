const createModel = require('../../models/job-band.model');
const { JobBands } = require('./job-bands.class');
const hooks = require('./job-bands.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/job-bands', new JobBands(options, app));

  const service = app.service('job-bands');

  service.hooks(hooks);
};

