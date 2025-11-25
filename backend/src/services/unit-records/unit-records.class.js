const { Service } = require('feathers-mongoose');

exports.UnitRecords = class UnitRecords extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Ensure company and createdBy are set
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin') {
        data.company = params.user.company;
      }
    }
    data.createdBy = params.user._id;

    // Get worker's unit rate if not provided
    if (!data.ratePerUnit && data.worker && data.unitType) {
      const Worker = this.app.service('workers').Model;
      const worker = await Worker.findById(data.worker);

      if (worker && worker.payrollInfo.unitRates) {
        const unitRate = worker.payrollInfo.unitRates.find(
          ur => ur.unitType === data.unitType
        );
        if (unitRate) {
          data.ratePerUnit = unitRate.ratePerUnit;
        }
      }
    }

    return super.create(data, params);
  }

  async find(params) {
    // Multi-tenant isolation
    if (params.user && params.user.role === 'subcon-admin') {
      params.query = {
        ...params.query,
        company: params.user.company
      };
    }

    return super.find(params);
  }

  async patch(id, data, params) {
    // Track manual edits
    const existing = await this.get(id, params);

    if (data.modifiedBy || params.user) {
      data.modifiedBy = data.modifiedBy || params.user._id;

      // Track edit history for important fields
      const trackedFields = ['unitsCompleted', 'unitsRejected', 'ratePerUnit'];
      const editHistory = existing.editHistory || [];

      for (const field of trackedFields) {
        if (data[field] !== undefined && data[field] !== existing[field]) {
          editHistory.push({
            editedBy: data.modifiedBy,
            editedAt: new Date(),
            field: field,
            oldValue: existing[field],
            newValue: data[field],
            reason: data.editReason || 'Manual edit'
          });
          data.manuallyEdited = true;
        }
      }

      if (editHistory.length > (existing.editHistory || []).length) {
        data.editHistory = editHistory;
      }
    }

    return super.patch(id, data, params);
  }
};

