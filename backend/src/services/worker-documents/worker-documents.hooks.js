const { authenticate } = require('@feathersjs/authentication').hooks;
const { filterByCompany, verifyAgentAccess, setCompanyOnCreate } = require('../../hooks/filter-by-company');

// Populate worker and company references
const populateReferences = () => {
  return async (context) => {
    const { result, app } = context;

    const populate = async (doc) => {
      if (!doc) return doc;

      // Populate worker
      if (doc.worker && typeof doc.worker !== 'object') {
        try {
          const worker = await app.service('workers').get(doc.worker, { provider: undefined });
          doc.worker = {
            _id: worker._id,
            firstName: worker.firstName,
            lastName: worker.lastName,
            email: worker.email,
            employeeId: worker.employeeId
          };
        } catch (e) {
          console.error('Error populating worker:', e.message);
        }
      }

      // Populate company
      if (doc.company && typeof doc.company !== 'object') {
        try {
          const company = await app.service('companies').get(doc.company, { provider: undefined });
          doc.company = {
            _id: company._id,
            name: company.name
          };
        } catch (e) {
          console.error('Error populating company:', e.message);
        }
      }

      return doc;
    };

    if (result) {
      if (result.data) {
        // Paginated result
        await Promise.all(result.data.map(populate));
      } else if (Array.isArray(result)) {
        await Promise.all(result.map(populate));
      } else {
        await populate(result);
      }
    }

    return context;
  };
};

// Update status based on expiry date
const updateDocumentStatus = () => {
  return async (context) => {
    const { data } = context;

    if (data && data.expiryDate) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiryDate = new Date(data.expiryDate);

      if (expiryDate < today) {
        data.status = 'expired';
      } else if (expiryDate <= thirtyDaysFromNow) {
        data.status = 'expiring-soon';
      } else {
        data.status = 'active';
      }
    }

    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [filterByCompany()],
    get: [filterByCompany()],
    create: [setCompanyOnCreate(), updateDocumentStatus()],
    update: [filterByCompany(), updateDocumentStatus()],
    patch: [filterByCompany(), updateDocumentStatus()],
    remove: [filterByCompany()]
  },

  after: {
    all: [],
    find: [populateReferences()],
    get: [verifyAgentAccess(), populateReferences()],
    create: [populateReferences()],
    update: [populateReferences()],
    patch: [populateReferences()],
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
