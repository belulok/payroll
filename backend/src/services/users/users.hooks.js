const { authenticate } = require('@feathersjs/authentication').hooks;
const {
  hashPassword, protect
} = require('@feathersjs/authentication-local').hooks;

const checkPermissions = require('../../hooks/check-permissions');

module.exports = {
  before: {
    all: [],
    find: [ authenticate('jwt') ],
    get: [ authenticate('jwt') ],
    create: [ hashPassword('password') ],
    update: [ hashPassword('password'), authenticate('jwt'), checkPermissions({ roles: ['admin'] }) ],
    patch: [ hashPassword('password'), authenticate('jwt'), checkPermissions({ roles: ['admin'] }) ],
    remove: [ authenticate('jwt'), checkPermissions({ roles: ['admin'] }) ]
  },

  after: {
    all: [ 
      // Make sure the password field is never sent to the client
      protect('password')
    ],
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

