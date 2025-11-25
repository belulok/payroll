const { Forbidden } = require('@feathersjs/errors');

module.exports = function checkPermissions(options = {}) {
  return async context => {
    const { user } = context.params;

    if (!user) {
      throw new Forbidden('You must be logged in');
    }

    const { roles } = options;

    if (roles && roles.length > 0) {
      if (!roles.includes(user.role)) {
        throw new Forbidden('You do not have the required permissions');
      }
    }

    return context;
  };
};

