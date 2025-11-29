const { authenticate } = require('@feathersjs/authentication').hooks;
const { iff, isProvider, disallow } = require('feathers-hooks-common');

// Permission check hook
const checkLoanPermissions = () => {
  return async (context) => {
    const { user } = context.params;
    
    if (!user) {
      throw new Error('Authentication required');
    }

    // Admin and agent can access all loans
    if (user.role === 'admin' || user.role === 'agent') {
      return context;
    }

    // Subcon-admin can only access their company's loans
    if (user.role === 'subcon-admin') {
      if (context.method === 'create') {
        context.data.company = user.company;
      } else if (context.method === 'find') {
        context.params.query.company = user.company;
      } else if (context.id) {
        // For get, patch, remove - check if loan belongs to user's company
        const loan = await context.app.service('loans').Model.findById(context.id);
        if (loan && loan.company.toString() !== user.company.toString()) {
          throw new Error('Unauthorized access to loan');
        }
      }
      return context;
    }

    // Workers cannot access loans service directly
    if (user.role === 'worker') {
      throw new Error('Workers cannot access loans directly');
    }

    throw new Error('Insufficient permissions');
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

      // Validate worker exists and belongs to same company
      if (data.worker) {
        const worker = await context.app.service('workers').get(data.worker);
        if (!worker) {
          throw new Error('Worker not found');
        }
        
        const loanCompany = data.company || context.params.user.company;
        const workerCompany = typeof worker.company === 'object' ? worker.company._id : worker.company;
        
        if (workerCompany.toString() !== loanCompany.toString()) {
          throw new Error('Worker does not belong to the specified company');
        }
      }
    }

    return context;
  };
};

// Auto-populate related data
const populateData = () => {
  return async (context) => {
    if (context.method === 'find' || context.method === 'get') {
      if (!context.params.query) context.params.query = {};
      
      context.params.query.$populate = [
        {
          path: 'worker',
          select: 'firstName lastName employeeId email phone'
        },
        {
          path: 'company',
          select: 'name'
        },
        {
          path: 'createdBy',
          select: 'firstName lastName'
        },
        {
          path: 'approvedBy',
          select: 'firstName lastName'
        }
      ];
    }
    
    return context;
  };
};

module.exports = {
  before: {
    all: [authenticate('jwt')],
    find: [checkLoanPermissions(), populateData()],
    get: [checkLoanPermissions(), populateData()],
    create: [checkLoanPermissions(), validateLoanData()],
    update: [disallow()],
    patch: [checkLoanPermissions(), validateLoanData()],
    remove: [checkLoanPermissions()]
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
