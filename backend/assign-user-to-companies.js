const mongoose = require('mongoose');
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

async function assignUserToCompanies() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Company = mongoose.model('companies');
    const User = mongoose.model('users', userSchema);

    // Get all companies
    const companies = await Company.find({});
    console.log(`\n📋 Found ${companies.length} companies:`);
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} (ID: ${company._id})`);
    });

    // Get all users
    const users = await User.find({});
    console.log(`\n👥 Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Role: ${user.role} - Company: ${user.company || 'None'}`);
    });

    // Find an admin or agent user to assign companies to
    const adminUser = users.find(u => u.role === 'admin');
    const agentUser = users.find(u => u.role === 'agent');

    if (agentUser && companies.length >= 2) {
      // Assign first two companies to the agent
      console.log(`\n🔗 Assigning companies to agent: ${agentUser.email}`);

      await Company.updateOne(
        { _id: companies[0]._id },
        { agent: agentUser._id }
      );
      console.log(`✅ Assigned ${companies[0].name} to agent`);

      if (companies[1]) {
        await Company.updateOne(
          { _id: companies[1]._id },
          { agent: agentUser._id }
        );
        console.log(`✅ Assigned ${companies[1].name} to agent`);
      }

      if (companies[2]) {
        await Company.updateOne(
          { _id: companies[2]._id },
          { agent: agentUser._id }
        );
        console.log(`✅ Assigned ${companies[2].name} to agent`);
      }
    }

    // Show final state
    console.log('\n📊 Final Company Assignments:');
    const updatedCompanies = await Company.find({}).populate('agent');
    updatedCompanies.forEach((company) => {
      console.log(`- ${company.name}: Agent = ${company.agent ? company.agent.email : 'None'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignUserToCompanies();

