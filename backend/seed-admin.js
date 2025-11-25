// Seed script to create an admin user
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongooseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: String,
  isActive: Boolean,
  employeeId: String,
  department: String,
  position: String,
  hireDate: Date,
  salary: Number
}, {
  timestamps: true
});

async function seedAdmin() {
  try {
    await mongoose.connect(mongooseUri);

    console.log('Connected to MongoDB');

    const User = mongoose.model('users', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@payroll.com' });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await User.create({
      email: 'admin@payroll.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      employeeId: 'EMP001',
      department: 'Administration',
      position: 'System Administrator',
      hireDate: new Date(),
      salary: 100000
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@payroll.com');
    console.log('Password: admin123');
    console.log('\nPlease change the password after first login!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();

