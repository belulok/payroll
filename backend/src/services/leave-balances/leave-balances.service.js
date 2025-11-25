const createModel = require('../../models/leave-balance.model');
const { LeaveBalances } = require('./leave-balances.class');
const hooks = require('./leave-balances.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/leave-balances', new LeaveBalances(options, app));

  const service = app.service('leave-balances');

  service.hooks(hooks);
};

