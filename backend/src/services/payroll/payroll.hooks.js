const { authenticate } = require('@feathersjs/authentication').hooks;
const checkPermissions = require('../../hooks/check-permissions');

module.exports = {
  before: {
    all: [ authenticate('jwt') ],
    find: [],
    get: [],
    create: [ checkPermissions({ roles: ['admin', 'agent'] }) ],
    update: [ checkPermissions({ roles: ['admin', 'agent'] }) ],
    patch: [ checkPermissions({ roles: ['admin', 'agent'] }) ],
    remove: [ checkPermissions({ roles: ['admin'] }) ]
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

