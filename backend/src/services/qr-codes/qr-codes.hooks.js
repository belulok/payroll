const { authenticate } = require('@feathersjs/authentication').hooks;
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

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
    all: [],
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



