const { authenticate } = require('@feathersjs/authentication').hooks;

// Set company from user
const setCompany = async (context) => {
  if (context.params.user && !context.data.company) {
    context.data.company = context.params.user.company;
  }
  return context;
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [],
    get: [],
    create: [setCompany],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
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



