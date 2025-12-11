const { authenticate } = require('@feathersjs/authentication').hooks;
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

// Hook to populate client field
const populateClient = () => {
  return async (context) => {
    const { app, result } = context;

    // Helper function to populate a single record
    const populate = async (record) => {
      if (!record) return record;

      // Populate client
      if (record.client && typeof record.client === 'string') {
        try {
          const clientData = await app.service('clients').get(record.client);
          record.client = clientData;
        } catch (error) {
          console.error('Error populating client:', error.message);
        }
      }

      return record;
    };

    // Handle both single result and paginated results
    if (result) {
      if (Array.isArray(result)) {
        context.result = await Promise.all(result.map(populate));
      } else if (result.data && Array.isArray(result.data)) {
        result.data = await Promise.all(result.data.map(populate));
      } else {
        context.result = await populate(result);
      }
    }

    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [filterByCompany()],
    get: [filterByCompany()],
    create: [setCompanyOnCreate()],
    update: [filterByCompany()],
    patch: [filterByCompany()],
    remove: [filterByCompany()]
  },

  after: {
    all: [populateClient()],
    find: [],
    get: [verifyAgentAccess()],
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
