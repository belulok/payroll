const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'subcon-admin', 'worker', 'agent', 'user'],
    default: 'user',
    required: true
  },

  // Company Reference (for subcon-admin and worker roles)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    index: true
  },

  // Worker Reference (for worker role)
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'workers'
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Legacy fields (keeping for backward compatibility)
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  department: String,
  position: String,
  hireDate: Date,
  salary: Number
}, {
  timestamps: true
});

// Indexes
userSchema.index({ company: 1, role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
userSchema.methods.isSubconAdmin = function() {
  return this.role === 'subcon-admin';
};

userSchema.methods.isWorker = function() {
  return this.role === 'worker';
};

userSchema.methods.isSystemAdmin = function() {
  return this.role === 'admin';
};

module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const users = mongooseClient.model('users', userSchema);

  return users;
};

