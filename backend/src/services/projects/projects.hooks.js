const { authenticate } = require('@feathersjs/authentication').hooks;

// Hook to populate client field
const populateClient = () => {
  return async (context) => {
    const { app, result } = context;

    console.log('🔍 [Projects Hook] populateClient called');
    console.log('🔍 [Projects Hook] Result type:', Array.isArray(result) ? 'array' : typeof result);
    console.log('🔍 [Projects Hook] Has result.data?', result && result.data ? 'yes' : 'no');

    // Helper function to populate a single record
    const populate = async (record) => {
      if (!record) return record;

      console.log('🔍 [Projects Hook] Populating record:', record.name);
      console.log('🔍 [Projects Hook] Client field type:', typeof record.client);
      console.log('🔍 [Projects Hook] Client field value:', record.client);

      // Populate client
      if (record.client && typeof record.client === 'string') {
        try {
          console.log('🔍 [Projects Hook] Fetching client:', record.client);
          const clientData = await app.service('clients').get(record.client);
          console.log('🔍 [Projects Hook] Client fetched:', clientData.name);
          record.client = clientData;
        } catch (error) {
          console.error('❌ [Projects Hook] Error populating client:', error);
        }
      } else {
        console.log('🔍 [Projects Hook] Client already populated or not set');
      }

      return record;
    };

    // Handle both single result and paginated results
    if (result) {
      if (Array.isArray(result)) {
        // Non-paginated array
        console.log('🔍 [Projects Hook] Processing non-paginated array');
        context.result = await Promise.all(result.map(populate));
      } else if (result.data && Array.isArray(result.data)) {
        // Paginated result
        console.log('🔍 [Projects Hook] Processing paginated result, count:', result.data.length);
        result.data = await Promise.all(result.data.map(populate));
      } else {
        // Single result
        console.log('🔍 [Projects Hook] Processing single result');
        context.result = await populate(result);
      }
    }

    console.log('🔍 [Projects Hook] populateClient completed');
    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [populateClient()],
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

