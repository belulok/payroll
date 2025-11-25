const { authenticate } = require('@feathersjs/authentication');
const populateUser = require('../../hooks/populate-user');

// Hook to populate worker field
const populateWorker = () => {
  return async (context) => {
    const { app, result } = context;

    // Helper function to populate a single record
    const populate = async (record) => {
      if (record && record.worker) {
        const workersService = app.service('workers');
        try {
          record.worker = await workersService.get(record.worker);
        } catch (error) {
          console.error('Error populating worker:', error);
        }
      }
      return record;
    };

    // Handle both single result and paginated results
    if (result) {
      if (Array.isArray(result)) {
        // Non-paginated array
        context.result = await Promise.all(result.map(populate));
      } else if (result.data && Array.isArray(result.data)) {
        // Paginated result
        result.data = await Promise.all(result.data.map(populate));
      } else {
        // Single result
        context.result = await populate(result);
      }
    }

    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt'), populateUser()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [populateWorker()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};

