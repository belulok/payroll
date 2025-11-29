const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
require('./src/models/company.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

// Define User schema inline
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
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

async function createAgentUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Company = mongoose.model('companies');
    const User = mongoose.model('users', userSchema);

    // Check if agent already exists
    let agent = await User.findOne({ email: 'agent@payroll.com' });
    
    if (!agent) {
      // Create agent user
      const hashedPassword = await bcrypt.hash('password123', 10);
      agent = await User.create({
        email: 'agent@payroll.com',
        password: hashedPassword,
        firstName: 'Agent',
        lastName: 'User',
        role: 'agent',
        isActive: true
      });
      console.log('✅ Created agent user: agent@payroll.com (password: password123)');
    } else {
      console.log('ℹ️  Agent user already exists: agent@payroll.com');
    }

    // Get all companies
    const companies = await Company.find({});
    console.log(`\n📋 Found ${companies.length} companies`);

    // Assign all companies to the agent
    for (const company of companies) {
      await Company.updateOne(
        { _id: company._id },
        { agent: agent._id }
      );
      console.log(`✅ Assigned "${company.name}" to agent`);
    }

    // Show final state
    console.log('\n📊 Final Company Assignments:');
    const updatedCompanies = await Company.find({}).populate('agent');
    updatedCompanies.forEach((company) => {
      console.log(`- ${company.name}: Agent = ${company.agent ? company.agent.email : 'None'}`);
    });

    console.log('\n🎉 Done! You can now login as:');
    console.log('   Email: agent@payroll.com');
    console.log('   Password: password123');
    console.log('   This agent can see all assigned companies in the dropdown.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAgentUser();

