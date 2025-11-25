const { Companies } = require('./companies.class');
const Company = require('../../models/company.model');
const hooks = require('./companies.hooks');
const checkCompanyAccess = require('../../hooks/check-company-access');

module.exports = function (app) {
  const options = {
    Model: Company,
    paginate: app.get('paginate'),
    whitelist: ['$populate']
  };

  // Initialize our service with any options it requires
  app.use('/companies', new Companies(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('companies');

  // Register hooks with company access check
  const hooksWithAccess = {
    ...hooks,
    before: {
      ...hooks.before,
      find: [...hooks.before.find, checkCompanyAccess()],
      get: [...hooks.before.get, checkCompanyAccess()],
      create: [...hooks.before.create, checkCompanyAccess()],
      update: [...hooks.before.update, checkCompanyAccess()],
      patch: [...hooks.before.patch, checkCompanyAccess()],
      remove: [...hooks.before.remove, checkCompanyAccess()]
    }
  };

  service.hooks(hooksWithAccess);
};

