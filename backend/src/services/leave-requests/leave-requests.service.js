const createModel = require('../../models/leave-request.model');
const { LeaveRequests } = require('./leave-requests.class');
const hooks = require('./leave-requests.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/leave-requests', new LeaveRequests(options, app));

  const service = app.service('leave-requests');

  service.hooks(hooks);
};

