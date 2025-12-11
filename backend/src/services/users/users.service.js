const { Users } = require('./users.class');
const createModel = require('../../models/users.model');
const hooks = require('./users.hooks');
const { authenticate } = require('@feathersjs/authentication').hooks;
const { Forbidden } = require('@feathersjs/errors');

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
      const user = params.user;

      // Check permissions - only admin, agent, or subcon-admin can reset passwords
      if (!user) {
        throw new Forbidden('Not authenticated');
      }

      const allowedRoles = ['admin', 'agent', 'subcon-admin'];
      if (!allowedRoles.includes(user.role)) {
        throw new Forbidden('You do not have permission to reset passwords');
      }

      return service.resetPassword(userId, params);
    }
  });

  // Add authentication to reset-password endpoint
  app.service('users/:id/reset-password').hooks({
    before: {
      all: [authenticate('jwt')]
    }
  });

  service.hooks(hooks);
};

