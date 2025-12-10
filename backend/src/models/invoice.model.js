const mongoose = require('mongoose');

	const invoiceItemSchema = new mongoose.Schema({
	  // Reference to workers collection (model name: 'workers')
	  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'workers', required: true },
  workerName: { type: String, required: true },
  team: { type: String },
  normalHours: { type: Number, default: 0 },
  otHours: { type: Number, default: 0 },
  sundayHours: { type: Number, default: 0 },
  phHours: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  normalRate: { type: Number, default: 0 },
  otRate: { type: Number, default: 0 },
  sundayRate: { type: Number, default: 0 },
  phRate: { type: Number, default: 0 },
  normalAmount: { type: Number, default: 0 },
  otAmount: { type: Number, default: 0 },
  sundayAmount: { type: Number, default: 0 },
  phAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  claimAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  dailyBreakdown: [{
    date: Date,
    normalHours: { type: Number, default: 0 },
    otHours: { type: Number, default: 0 },
    sundayHours: { type: Number, default: 0 },
    phHours: { type: Number, default: 0 }
  }]
});

const invoiceSchema = new mongoose.Schema({
  // Invoice number is generated automatically in a pre-save hook. We keep it
  // unique, but don't mark it as required so validation doesn't fail before
  // the hook runs.
  invoiceNumber: { type: String, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: { type: String, required: true },
	  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
	  projectName: { type: String, required: true },
	  // Company reference uses the underlying model name 'companies'
	  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'companies', required: true },

	  // Period Information
	  // "custom" allows invoices generated for an arbitrary date range
	  periodType: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Invoice Details
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },

  // Summary Totals
  totalNormalHours: { type: Number, default: 0 },
  totalOtHours: { type: Number, default: 0 },
  totalSundayHours: { type: Number, default: 0 },
  totalPhHours: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },

  subtotalAmount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalClaimAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },

  // Payment Information
  paymentTerms: { type: String, default: '30 days' },
  paymentMethod: { type: String },
  paidDate: { type: Date },
  paidAmount: { type: Number, default: 0 },

  // Invoice Items (Worker Details)
  items: [invoiceItemSchema],

  // Notes
  notes: { type: String },
  internalNotes: { type: String }
}, {
  timestamps: true
});

// Generate invoice number just before saving. This runs for both manually
// created invoices and those generated via the custom generate endpoint.
// We use the promise-based form of Mongoose middleware (no `next` callback)
// to avoid any issues with `next` not being a function.
invoiceSchema.pre('save', async function() {
	  if (!this.invoiceNumber) {
	    const year = new Date().getFullYear();
	    const month = String(new Date().getMonth() + 1).padStart(2, '0');
	    const count = await this.constructor.countDocuments({
	      invoiceNumber: { $regex: `^INV-${year}${month}` }
	    });
	    this.invoiceNumber = `INV-${year}${month}${String(count + 1).padStart(4, '0')}`;
	  }
	});

// Calculate totals
invoiceSchema.methods.calculateTotals = function() {
  this.totalNormalHours = this.items.reduce((sum, item) => sum + item.normalHours, 0);
  this.totalOtHours = this.items.reduce((sum, item) => sum + item.otHours, 0);
  this.totalSundayHours = this.items.reduce((sum, item) => sum + item.sundayHours, 0);
  this.totalPhHours = this.items.reduce((sum, item) => sum + item.phHours, 0);
  this.totalHours = this.totalNormalHours + this.totalOtHours + this.totalSundayHours + this.totalPhHours;

  this.subtotalAmount = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  this.taxAmount = this.subtotalAmount * (this.taxRate / 100);
  this.totalClaimAmount = this.items.reduce((sum, item) => sum + item.claimAmount, 0);
  this.grandTotal = this.subtotalAmount + this.taxAmount + this.totalClaimAmount;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
