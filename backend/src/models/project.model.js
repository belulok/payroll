const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: false,
    index: true
  },
  projectCode: {
    type: String,
    trim: true,
    sparse: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
    default: 'active'
  },
  location: {
    street: String,
    city: String,
    state: String,
    postcode: String,
    country: { type: String, default: 'Malaysia' }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
projectSchema.index({ company: 1, name: 1 });
projectSchema.index({ company: 1, client: 1 });
projectSchema.index({ company: 1, isActive: 1 });
projectSchema.index({ client: 1, isActive: 1 });

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  return mongooseClient.model('Project', projectSchema);
};

