const { Service } = require('feathers-mongoose');
const createModel = require('../../models/attendance.model');

class Attendance extends Service {
  constructor(options, app) {
    super(options, app);
    this.app = app;
  }
}

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate'),
    whitelist: ['$populate']
  };

  app.use('/attendance', new Attendance(options, app));

  const service = app.service('attendance');

  service.hooks({
    before: {
      all: [],
      find: [],
      get: [],
      create: [],
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
  });
};



