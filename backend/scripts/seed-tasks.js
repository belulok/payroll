require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../src/models/task.model');
const Company = require('../src/models/company.model');
const Department = require('../src/models/department.model');
const Position = require('../src/models/position.model');

async function seedTasks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the first company
    const company = await Company.findOne();
    if (!company) {
      console.log('No company found. Please create a company first.');
      return;
    }

    // Get some departments and positions for assignment
    const departments = await Department.find({ company: company._id, isActive: true }).limit(3);
    const positions = await Position.find({ company: company._id, isActive: true }).limit(5);

    console.log(`Found ${departments.length} departments and ${positions.length} positions`);

    // Sample tasks data
    const sampleTasks = [
      {
        company: company._id,
        name: 'User Authentication System',
        taskId: 'TASK-001',
        isActive: true
      },
      {
        company: company._id,
        name: 'Database Performance Optimization',
        taskId: 'TASK-002',
        isActive: true
      },
      {
        company: company._id,
        name: 'API Documentation Update',
        taskId: 'TASK-003',
        isActive: true
      },
      {
        company: company._id,
        name: 'Unit Testing Implementation',
        taskId: 'TASK-004',
        isActive: true
      },
      {
        company: company._id,
        name: 'Weekly Team Meeting',
        taskId: 'TASK-005',
        isActive: true
      },
      {
        company: company._id,
        name: 'React Training Session',
        taskId: 'TASK-006',
        isActive: true
      },
      {
        company: company._id,
        name: 'Legacy Code Refactoring',
        taskId: 'TASK-007',
        isActive: true
      },
      {
        company: company._id,
        name: 'Security Audit',
        taskId: 'TASK-008',
        isActive: true
      },
      {
        company: company._id,
        name: 'Frontend UI/UX Improvements',
        taskId: 'TASK-009',
        isActive: true
      },
      {
        company: company._id,
        name: 'Backend API Development',
        taskId: 'TASK-010',
        isActive: true
      }
    ];

    // Clear existing tasks for this company
    await Task.deleteMany({ company: company._id });
    console.log('Cleared existing tasks');

    // Insert sample tasks
    const insertedTasks = await Task.insertMany(sampleTasks);
    console.log(`✅ Successfully inserted ${insertedTasks.length} sample tasks`);

    // Display summary
    console.log('\n📊 Tasks Summary:');
    console.log(`- Total Tasks: ${sampleTasks.length}`);
    console.log(`- Active Tasks: ${sampleTasks.filter(t => t.isActive).length}`);
    console.log(`- Inactive Tasks: ${sampleTasks.filter(t => !t.isActive).length}`);

  } catch (error) {
    console.error('Error seeding tasks:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedTasks();
