const { authenticate } = require('@feathersjs/authentication').hooks;
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

// Allow clients to create tasks - set company from their client record
const setCompanyForClient = () => {
  return async (context) => {
    const { params, data, app } = context;
    const user = params.user;

    if (!params.provider || !user) {
      return context;
    }

    // If user is a client, get their company from the client record
    if (user.role === 'client' && user.client) {
      try {
        const client = await app.service('clients').get(user.client, { provider: undefined });
        if (client.company) {
          data.company = client.company;
          data.client = user.client; // Also tag the task with the client
          data.createdByClient = true; // Flag to indicate client-created task
        }
      } catch (error) {
        console.error('Error getting client for task:', error);
      }
    }

    return context;
  };
};

// Filter tasks for client users
const filterForClientRole = () => {
  return async (context) => {
    const { params, method, app } = context;
    const user = params.user;

    if (!params.provider || !user) {
      return context;
    }

    if (user.role === 'client' && user.client) {
      try {
        // Get client's companies
        const client = await app.service('clients').get(user.client, { provider: undefined });
        const clientCompanies = client.companies || [client.company];

        params.query = params.query || {};
        
        if (method === 'find') {
          // Client can see tasks from their companies OR tasks assigned to them
          params.query.$or = [
            { company: { $in: clientCompanies } },
            { client: user.client }
          ];
        }
      } catch (error) {
        console.error('Error filtering tasks for client:', error);
      }
    }

    return context;
  };
};

// Populate task references
const populateReferences = () => {
  return async (context) => {
    const { app, result } = context;

    const populate = async (record) => {
      if (!record) return record;

      // Populate assignedTo
      if (record.assignedTo && typeof record.assignedTo === 'string') {
        try {
          const worker = await app.service('workers').get(record.assignedTo, { provider: undefined });
          record.assignedTo = {
            _id: worker._id,
            firstName: worker.firstName,
            lastName: worker.lastName
          };
        } catch (error) {
          // Silently fail
        }
      }

      // Populate project
      if (record.project && typeof record.project === 'string') {
        try {
          const project = await app.service('projects').get(record.project, { provider: undefined });
          record.project = {
            _id: project._id,
            name: project.name
          };
        } catch (error) {
          // Silently fail
        }
      }

      return record;
    };

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
    get: [filterByCompany()],
    create: [setCompanyForClient(), setCompanyOnCreate()],
    update: [filterByCompany()],
    patch: [filterByCompany()],
    remove: [filterByCompany()]
  },

  after: {
    all: [populateReferences()],
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
