const { authenticate } = require('@feathersjs/authentication').hooks;
const checkPermissions = require('../../hooks/check-permissions');
const { filterByCompany, verifyAgentAccess } = require('../../hooks/filter-by-company');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [ filterByCompany() ],
    get: [ filterByCompany() ],
    create: [ checkPermissions({ roles: ['admin', 'agent', 'subcon-admin'] }), filterByCompany() ],
    update: [ checkPermissions({ roles: ['admin', 'agent', 'subcon-admin'] }), filterByCompany() ],
    patch: [ checkPermissions({ roles: ['admin', 'agent', 'subcon-admin'] }), filterByCompany() ],
    remove: [ checkPermissions({ roles: ['admin', 'subcon-admin'] }), filterByCompany() ]
  },

  after: {
    all: [],
    find: [],
    get: [ verifyAgentAccess() ],
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
