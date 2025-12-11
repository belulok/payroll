const { authenticate } = require('@feathersjs/authentication').hooks;
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

// Hook to set createdBy for leave requests
const setCreatedBy = () => async context => {
  const { data, params } = context;
  if (params.user) {
    data.createdBy = params.user._id;
  }
  return context;
};

// Hook to allow workers to view their own leave requests
const filterWorkerLeaveRequests = () => async context => {
  const { params } = context;
  const user = params.user;

  if (!user) return context;

  // Workers can only see their own leave requests
  if (user.role === 'worker' && user.worker) {
    params.query = params.query || {};
    params.query.worker = user.worker;
  }

  return context;
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [filterWorkerLeaveRequests(), filterByCompany()],
    get: [filterByCompany()],
    create: [setCompanyOnCreate(), setCreatedBy()],
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
