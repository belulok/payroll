const createModel = require('../../models/gazetted-holiday.model');
const { GazettedHolidays } = require('./gazetted-holidays.class');
const hooks = require('./gazetted-holidays.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate')
  };

  app.use('/gazetted-holidays', new GazettedHolidays(options, app));

  const service = app.service('gazetted-holidays');

  service.hooks(hooks);
};

