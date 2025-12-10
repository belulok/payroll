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

    // Generate loan ID if not provided (different prefix for loan vs advance)
    if (!data.loanId) {
      const category = data.category || 'advance';
      const prefix = category === 'loan' ? 'LOAN' : 'ADV';

      // Count only records of the same category for proper sequencing
      const count = await this.Model.countDocuments({
        company: data.company,
        category: category
      });

      data.loanId = `${prefix}${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate total amount with interest
    if (data.interestRate > 0) {
      data.totalAmount = data.principalAmount * (1 + data.interestRate / 100);
    } else {
      data.totalAmount = data.principalAmount;
    }
    data.remainingAmount = data.totalAmount;

    // Create the loan document using Model directly to get Mongoose document
    const loanDoc = new this.Model(data);

    // Generate installments if needed
    if (loanDoc.hasInstallments) {
      loanDoc.generateInstallments();
    }

    // Save the document
    await loanDoc.save();

    // Return the saved loan with proper formatting
    return loanDoc.toObject();
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

    // Check if we need to regenerate installments
    const needsInstallmentRegeneration = data.hasInstallments && (
      data.installmentType !== undefined ||
      data.installmentAmount !== undefined ||
      data.installmentCount !== undefined ||
      data.startDate !== undefined
    );

    if (needsInstallmentRegeneration) {
      // Get the Mongoose document to use the method
      const loanDoc = await this.Model.findById(id);

      // Update the document with new data
      Object.assign(loanDoc, data);

      // Regenerate installments
      loanDoc.generateInstallments();

      // Save and return
      await loanDoc.save();
      return loanDoc.toObject();
    }

    // Otherwise use normal patch
    return await super.patch(id, data, params);
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
