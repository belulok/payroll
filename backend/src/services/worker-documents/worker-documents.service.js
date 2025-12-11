const { WorkerDocuments } = require('./worker-documents.class');
const WorkerDocument = require('../../models/worker-document.model');
const hooks = require('./worker-documents.hooks');

module.exports = function (app) {
  const options = {
    Model: WorkerDocument,
    paginate: app.get('paginate'),
    whitelist: ['$populate', '$regex', '$options']
  };

  // Initialize our service with any options it requires
  app.use('/worker-documents', new WorkerDocuments(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('worker-documents');

  // Register hooks
  service.hooks(hooks);

  // Custom route for getting documents by worker
  app.get('/workers/:workerId/documents', async (req, res) => {
    try {
      const result = await service.findByWorker(req.params.workerId, {
        user: req.user,
        query: req.query
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Custom route for expiring documents
  app.get('/worker-documents/expiring/:days', async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const companyId = req.query.company || null;
      const result = await service.findExpiring(days, companyId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
};


