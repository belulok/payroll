const { Users } = require('./users.class');
const createModel = require('../../models/users.model');
const hooks = require('./users.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/users', new Users(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('users');

  // Register custom method for password reset
  app.use('/users/:id/reset-password', {
    async create(data, params) {
      const userId = params.route.id;
      return service.resetPassword(userId, params);
    }
  });

  service.hooks(hooks);
};

