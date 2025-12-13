const createModel = require('../../models/qr-code.model');
const { QRCodes } = require('./qr-codes.class');
const hooks = require('./qr-codes.hooks');

module.exports = function (app) {
  const options = {
    Model: createModel,
    paginate: app.get('paginate'),
    whitelist: ['$populate']
  };

  // Register the main QR codes service
  app.use('/qr-codes', new QRCodes(options, app));

  const service = app.service('qr-codes');
  service.hooks(hooks);

  // Register a custom endpoint for validating check-in
  app.use('/qr-codes/validate-checkin', {
    async create(data, params) {
      const qrCodesService = app.service('qr-codes');
      return qrCodesService.validateCheckIn(data.qrCode, data.location, params);
    }
  });

  // Add authentication to the validate endpoint
  app.service('qr-codes/validate-checkin').hooks({
    before: {
      all: [require('@feathersjs/authentication').hooks.authenticate('jwt')]
    }
  });
};



