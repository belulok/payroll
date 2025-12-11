const { authenticate } = require('@feathersjs/authentication').hooks;
const { disallow } = require('feathers-hooks-common');
const { filterByCompany, verifyAgentAccess } = require('../../hooks/filter-by-company');

// Permission check hook
const checkLoanPermissions = () => {
  return async (context) => {
    const { user } = context.params;

    if (!user) {
      throw new Error('Authentication required');
    }

    // Admin, agent, and subcon-admin can access loans
    if (!['admin', 'agent', 'subcon-admin'].includes(user.role)) {
      throw new Error('Insufficient permissions to access loans');
    }

    return context;
  };
};

// Validate loan data
const validateLoanData = () => {
  return async (context) => {
    const { data } = context;

    if (context.method === 'create' || context.method === 'patch') {
      // Validate principal amount
      if (data.principalAmount !== undefined && data.principalAmount <= 0) {
        throw new Error('Principal amount must be greater than 0');
      }

      // Validate interest rate
      if (data.interestRate !== undefined && (data.interestRate < 0 || data.interestRate > 100)) {
        throw new Error('Interest rate must be between 0 and 100');
      }

      // Validate installment settings
      if (data.hasInstallments) {
        if (data.installmentType === 'fixed_amount' && (!data.installmentAmount || data.installmentAmount <= 0)) {
          throw new Error('Installment amount must be greater than 0');
        }

        if (data.installmentType === 'fixed_count' && (!data.installmentCount || data.installmentCount <= 0)) {
          throw new Error('Installment count must be greater than 0');
        }

        if (!data.startDate) {
          throw new Error('Start date is required for installment loans');
        }
      }

      // Validate worker exists
      if (data.worker) {
        const worker = await context.app.service('workers').get(data.worker);
        if (!worker) {
          throw new Error('Worker not found');
        }
      }
    }

    return context;
  };
};

// Populate worker and company in after hooks
const populateAfter = () => {
  return async (context) => {
    const { app, result } = context;

    const populate = async (loan) => {
      if (!loan) return loan;

      // Populate worker
      if (loan.worker && typeof loan.worker !== 'object') {
        try {
          const worker = await app.service('workers').get(loan.worker, { provider: undefined });
          loan.worker = {
            _id: worker._id,
            firstName: worker.firstName,
            lastName: worker.lastName,
            employeeId: worker.employeeId,
            email: worker.email,
            phone: worker.phone,
            profilePicture: worker.profilePicture
          };
        } catch (e) {
          console.error('Error populating worker for loan:', e.message);
        }
      }

      // Populate company
      if (loan.company && typeof loan.company !== 'object') {
        try {
          const company = await app.service('companies').get(loan.company, { provider: undefined });
          loan.company = {
            _id: company._id,
            name: company.name
          };
        } catch (e) {
          console.error('Error populating company for loan:', e.message);
        }
      }

      return loan;
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

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [checkLoanPermissions(), filterByCompany()],
    get: [checkLoanPermissions(), filterByCompany()],
    create: [checkLoanPermissions(), filterByCompany(), validateLoanData()],
    update: [disallow()],
    patch: [checkLoanPermissions(), filterByCompany(), validateLoanData()],
    remove: [checkLoanPermissions(), filterByCompany()]
  },

  after: {
    all: [],
    find: [populateAfter()],
    get: [verifyAgentAccess(), populateAfter()],
    create: [populateAfter()],
    update: [],
    patch: [populateAfter()],
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
