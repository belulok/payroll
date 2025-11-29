const mongoose = require('mongoose');
const path = require('path');

// Core models
const Worker = require('../src/models/worker.model');
const Company = require('../src/models/company.model');

// Models exported as factory functions (need mongooseClient via app)
const createClientModel = require('../src/models/client.model');
const createProjectModel = require('../src/models/project.model');

// Load environment variables (for MONGODB_URI)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

async function main() {
  const applyChanges = process.argv.includes('--apply');

  console.log(`Connecting to MongoDB at ${MONGODB_URI} ...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Minimal app stub for models that expect app.get('mongooseClient')
  const app = {
    get(name) {
      if (name === 'mongooseClient') return mongoose;
      return null;
    },
  };

  const Client = createClientModel(app);
  const Project = createProjectModel(app);

  console.log(`Running in ${applyChanges ? 'APPLY' : 'DRY-RUN'} mode`);

  // 1. Report clients missing company
  const clientsMissingCompany = await Client.find({
    $or: [
      { company: { $exists: false } },
      { company: null },
    ],
  });

  console.log(`Clients without company: ${clientsMissingCompany.length}`);
  if (clientsMissingCompany.length > 0) {
    console.log('Example client without company:', {
      _id: clientsMissingCompany[0]._id,
      name: clientsMissingCompany[0].name,
    });
  }

  // 2. Fix workers that are missing company but have a client with company
  const workersNeedingCompany = await Worker.find({
    $or: [
      { company: { $exists: false } },
      { company: null },
    ],
  }).populate('client', 'company name');

  let workerFixes = 0;
  for (const worker of workersNeedingCompany) {
    if (worker.client && worker.client.company) {
      console.log('[Worker] Setting company from client:', {
        workerId: worker._id,
        workerName: `${worker.firstName} ${worker.lastName}`,
        clientId: worker.client._id,
        clientCompany: worker.client.company,
      });

      if (applyChanges) {
        worker.company = worker.client.company;
        await worker.save();
        workerFixes += 1;
      }
    }
  }

  // 3. Fix projects that are missing company but have a client with company
  const projectsNeedingCompany = await Project.find({
    $or: [
      { company: { $exists: false } },
      { company: null },
    ],
  }).populate('client', 'company name');

  let projectFixes = 0;
  for (const project of projectsNeedingCompany) {
    if (project.client && project.client.company) {
      console.log('[Project] Setting company from client:', {
        projectId: project._id,
        projectName: project.name,
        clientId: project.client._id,
        clientCompany: project.client.company,
      });

      if (applyChanges) {
        project.company = project.client.company;
        await project.save();
        projectFixes += 1;
      }
    }
  }

  console.log('Summary:');
  console.log(`  Workers updated: ${workerFixes}`);
  console.log(`  Projects updated: ${projectFixes}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error running fix-company-links script:', err);
    mongoose.disconnect().finally(() => {
      process.exit(1);
    });
  });
