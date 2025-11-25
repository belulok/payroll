const createModel = require('../../models/unit-record.model');
const { UnitRecords } = require('./unit-records.class');
const hooks = require('./unit-records.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/unit-records', new UnitRecords(options, app));

  const service = app.service('unit-records');

  service.hooks(hooks);
};

