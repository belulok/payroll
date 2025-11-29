const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },

  // Task Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  taskId: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes
taskSchema.index({ company: 1, name: 1 });
taskSchema.index({ company: 1, taskId: 1 }, { unique: true });
taskSchema.index({ company: 1, isActive: 1 });

const Task = mongoose.model('tasks', taskSchema);

module.exports = Task;
