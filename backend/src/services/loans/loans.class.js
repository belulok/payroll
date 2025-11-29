const { Service } = require('feathers-mongoose');

exports.Loans = class Loans extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Ensure company is set from authenticated user if not provided
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin') {
        data.company = params.user.company;
      }
    }

    // Set created by
    if (params.user) {
      data.createdBy = params.user._id;
    }

    // Generate loan ID if not provided
    if (!data.loanId) {
      const count = await this.Model.countDocuments({ company: data.company });
      data.loanId = `LOAN${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate total amount with interest
    if (data.interestRate > 0) {
      data.totalAmount = data.principalAmount * (1 + data.interestRate / 100);
    } else {
      data.totalAmount = data.principalAmount;
    }
    data.remainingAmount = data.totalAmount;

    // Create the loan
    const loan = await super.create(data, params);

    // Generate installments if needed
    if (loan.hasInstallments) {
      loan.generateInstallments();
      await loan.save();
    }

    return loan;
  }

  async patch(id, data, params) {
    const existing = await this.get(id, params);

    // Check company access for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      const existingCompanyId = existing.company.toString();
      const userCompanyId = params.user.company.toString();

      if (existingCompanyId !== userCompanyId) {
        throw new Error('Unauthorized access to loan');
      }
    }

    // Recalculate if principal or interest changed
    if (data.principalAmount !== undefined || data.interestRate !== undefined) {
      const principalAmount = data.principalAmount || existing.principalAmount;
      const interestRate = data.interestRate !== undefined ? data.interestRate : existing.interestRate;
      
      if (interestRate > 0) {
        data.totalAmount = principalAmount * (1 + interestRate / 100);
      } else {
        data.totalAmount = principalAmount;
      }
      data.remainingAmount = data.totalAmount - existing.totalPaidAmount;
    }

    const updated = await super.patch(id, data, params);

    // Regenerate installments if installment settings changed
    if (updated.hasInstallments && (
      data.installmentType !== undefined ||
      data.installmentAmount !== undefined ||
      data.installmentCount !== undefined ||
      data.startDate !== undefined
    )) {
      updated.generateInstallments();
      await updated.save();
    }

    return updated;
  }

  async find(params) {
    // Multi-tenant isolation
    if (params.user && params.user.role === 'subcon-admin') {
      params.query = {
        ...params.query,
        company: params.user.company
      };
    }

    // Default population
    if (!params.query.$populate) {
      params.query.$populate = [
        {
          path: 'worker',
          select: 'firstName lastName employeeId'
        },
        {
          path: 'company',
          select: 'name'
        },
        {
          path: 'createdBy',
          select: 'firstName lastName'
        }
      ];
    }

    return super.find(params);
  }

  async get(id, params) {
    // Multi-tenant isolation for subcon-admin
    if (params.user && params.user.role === 'subcon-admin') {
      const loan = await this.Model.findById(id);
      if (loan && loan.company.toString() !== params.user.company.toString()) {
        throw new Error('Unauthorized access to loan');
      }
    }

    // Default population
    if (!params.query) params.query = {};
    if (!params.query.$populate) {
      params.query.$populate = [
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

    return super.get(id, params);
  }

  // Custom method to record payment
  async recordPayment(id, paymentData, params) {
    const loan = await this.get(id, params);
    
    const { amount, payrollRecordId, installmentNumber } = paymentData;
    
    // Update total paid amount
    loan.totalPaidAmount += amount;
    loan.remainingAmount = loan.totalAmount - loan.totalPaidAmount;
    
    // Update specific installment if provided
    if (installmentNumber && loan.installments) {
      const installment = loan.installments.find(inst => inst.installmentNumber === installmentNumber);
      if (installment) {
        installment.paidAmount += amount;
        installment.paidAt = new Date();
        installment.payrollRecordId = payrollRecordId;
        
        if (installment.paidAmount >= installment.amount) {
          installment.status = 'paid';
        }
      }
    }
    
    // Check if loan is completed
    if (loan.remainingAmount <= 0) {
      loan.status = 'completed';
      loan.completedAt = new Date();
    }
    
    await loan.save();
    return loan;
  }
};
