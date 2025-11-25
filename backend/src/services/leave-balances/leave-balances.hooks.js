const { authenticate } = require('@feathersjs/authentication').hooks;

const populateLeaveType = () => {
  return async (context) => {
    const { app, result } = context;

    const populate = async (record) => {
      if (record && record.leaveType) {
        const leaveTypesService = app.service('leave-types');
        try {
          record.leaveType = await leaveTypesService.get(record.leaveType);
        } catch (error) {
          console.error('Error populating leave type:', error);
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
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [populateLeaveType()],
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

