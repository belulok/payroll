require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const Company = require('./src/models/company.model');
const Worker = require('./src/models/worker.model');

async function seedPhase1() {
  try {
    // Connect to MongoDB
    const mongooseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';
    await mongoose.connect(mongooseUri);
    console.log('✓ Connected to MongoDB\n');

    // Define User schema (same as in users.model.js)
    const userSchema = new mongoose.Schema({
      email: { type: String, unique: true, lowercase: true, required: true },
      password: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      role: {
        type: String,
        enum: ['admin', 'subcon-admin', 'worker', 'agent', 'user'],
        default: 'user',
        required: true
      },
      company: { type: mongoose.Schema.Types.ObjectId, ref: 'companies' },
      worker: { type: mongoose.Schema.Types.ObjectId, ref: 'workers' },
      isActive: { type: Boolean, default: true },
      employeeId: { type: String, unique: true, sparse: true },
      department: String,
      position: String,
      hireDate: Date,
      salary: Number
    }, { timestamps: true });

    const User = mongoose.models.users || mongoose.model('users', userSchema);

    // 1. Create System Admin (if not exists)
    console.log('1. Creating System Admin...');
    let admin = await User.findOne({ email: 'admin@payroll.com' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        email: 'admin@payroll.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        isActive: true
      });
      console.log('   ✓ System Admin created');
    } else {
      console.log('   ✓ System Admin already exists');
    }

    // 2. Create Test Subcon Company
    console.log('\n2. Creating Test Subcon Company...');
    let company = await Company.findOne({ email: 'subcon1@example.com' });
    if (!company) {
      company = await Company.create({
        name: 'ABC Construction Sdn Bhd',
        registrationNumber: 'ROC123456',
        email: 'subcon1@example.com',
        phone: '+60123456789',
        address: {
          street: '123 Jalan Utama',
          city: 'Kuala Lumpur',
          state: 'Wilayah Persekutuan',
          postcode: '50000',
          country: 'Malaysia'
        },
        subscription: {
          plan: 'standard',
          status: 'active',
          startDate: new Date(),
          maxWorkers: 50,
          monthlyFee: 249,
          autoRenew: true
        },
        payrollSettings: {
          currency: 'MYR',
          paymentCycle: 'monthly',
          overtimeRates: {
            ot1_5: 1.5,
            ot2_0: 2.0
          },
          epfEnabled: true,
          socsoEnabled: true,
          eisEnabled: true
        },
        isActive: true
      });
      console.log('   ✓ Company created:', company.name);
    } else {
      console.log('   ✓ Company already exists:', company.name);
    }

    // 3. Create Subcon Admin User
    console.log('\n3. Creating Subcon Admin User...');
    let subconAdmin = await User.findOne({ email: 'subcon.admin@example.com' });
    if (!subconAdmin) {
      const hashedPassword = await bcrypt.hash('subcon123', 10);
      subconAdmin = await User.create({
        email: 'subcon.admin@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Tan',
        role: 'subcon-admin',
        company: company._id,
        isActive: true
      });

      // Update company with admin user reference
      company.adminUser = subconAdmin._id;
      await company.save();

      console.log('   ✓ Subcon Admin created');
    } else {
      console.log('   ✓ Subcon Admin already exists');
    }

    // 4. Create Test Workers
    console.log('\n4. Creating Test Workers...');
    const workerData = [
      {
        employeeId: 'W001',
        firstName: 'Ahmad',
        lastName: 'Ibrahim',
        email: 'ahmad@example.com',
        phone: '+60123456701',
        icNumber: '900101-01-1234',
        position: 'Construction Worker',
        department: 'Construction',
        payrollInfo: {
          hourlyRate: 15.00,
          currency: 'MYR',
          epfNumber: 'EPF001',
          socsoNumber: 'SOCSO001'
        }
      },
      {
        employeeId: 'W002',
        firstName: 'Kumar',
        lastName: 'Subramaniam',
        email: 'kumar@example.com',
        phone: '+60123456702',
        icNumber: '850505-05-5678',
        position: 'Site Supervisor',
        department: 'Construction',
        payrollInfo: {
          hourlyRate: 25.00,
          currency: 'MYR',
          epfNumber: 'EPF002',
          socsoNumber: 'SOCSO002'
        }
      },
      {
        employeeId: 'W003',
        firstName: 'Lee',
        lastName: 'Wei Ming',
        email: 'lee@example.com',
        phone: '+60123456703',
        icNumber: '920303-03-9012',
        position: 'Electrician',
        department: 'Electrical',
        payrollInfo: {
          hourlyRate: 20.00,
          currency: 'MYR',
          epfNumber: 'EPF003',
          socsoNumber: 'SOCSO003'
        }
      }
    ];

    for (const data of workerData) {
      const existing = await Worker.findOne({
        company: company._id,
        employeeId: data.employeeId
      });

      if (!existing) {
        await Worker.create({
          ...data,
          company: company._id,
          isActive: true,
          employmentStatus: 'active'
        });
        console.log(`   ✓ Worker created: ${data.firstName} ${data.lastName}`);
      } else {
        console.log(`   ✓ Worker already exists: ${data.firstName} ${data.lastName}`);
      }
    }

    console.log('\n✅ Phase 1 Seed Complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nSystem Admin:');
    console.log('  Email:    admin@payroll.com');
    console.log('  Password: admin123');
    console.log('\nSubcon Admin:');
    console.log('  Email:    subcon.admin@example.com');
    console.log('  Password: subcon123');
    console.log('  Company:  ABC Construction Sdn Bhd');
    console.log('\n═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedPhase1();

