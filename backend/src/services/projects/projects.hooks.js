const { authenticate } = require('@feathersjs/authentication').hooks;
const { Forbidden } = require('@feathersjs/errors');
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

// Filter projects for client users - they see projects where they are the client
const filterForClientRole = () => {
  return async (context) => {
    const { params, method } = context;
    const user = params.user;

    if (!params.provider || !user) {
      return context;
    }

    if (user.role === 'client' && user.client) {
      params.query = params.query || {};
      
      if (method === 'find') {
        params.query.client = user.client;
      } else if (method === 'get' && context.id) {
        params._userClientId = user.client;
      }
    }

    return context;
  };
};

// Verify client can access the project
const verifyClientProjectAccess = () => {
  return async (context) => {
    const { params, result, method } = context;
    const user = params.user;

    if (method !== 'get' || !user || user.role !== 'client') {
      return context;
    }

    if (!result || !params._userClientId) {
      return context;
    }

    const projectClientId = typeof result.client === 'object' 
      ? result.client._id?.toString() 
      : result.client?.toString();

    if (projectClientId !== params._userClientId.toString()) {
      throw new Forbidden('You can only view your own projects');
    }

    return context;
  };
};

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
    find: [filterForClientRole(), filterByCompany()],
    get: [filterForClientRole(), filterByCompany()],
    create: [setCompanyOnCreate()],
    update: [filterByCompany()],
    patch: [filterByCompany()], // Allow clients to patch projects (add locations)
    remove: [filterByCompany()]
  },

  after: {
    all: [populateClient()],
    find: [],
    get: [verifyAgentAccess(), verifyClientProjectAccess()],
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
