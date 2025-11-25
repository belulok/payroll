// Test script to check if backend can start
console.log('Testing backend configuration...\n');

// Test 1: Check if all required modules are installed
console.log('1. Checking required modules...');
try {
  require('@feathersjs/feathers');
  require('@feathersjs/express');
  require('@feathersjs/socketio');
  require('@feathersjs/authentication');
  require('@feathersjs/authentication-local');
  require('mongoose');
  require('dotenv');
  require('cors');
  console.log('   ✓ All required modules are installed\n');
} catch (err) {
  console.error('   ✗ Missing module:', err.message);
  process.exit(1);
}

// Test 2: Check if .env file exists
console.log('2. Checking .env file...');
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env'))) {
  console.log('   ✓ .env file exists\n');
} else {
  console.log('   ⚠ .env file not found (will use default config)\n');
}

// Test 3: Check if config file exists
console.log('3. Checking config file...');
if (fs.existsSync(path.join(__dirname, 'config', 'default.json'))) {
  console.log('   ✓ config/default.json exists\n');
} else {
  console.error('   ✗ config/default.json not found');
  process.exit(1);
}

// Test 4: Try to load the app
console.log('4. Loading application...');
try {
  require('dotenv').config();
  const app = require('./src/app');
  console.log('   ✓ Application loaded successfully\n');

  // Test 5: Check configuration
  console.log('5. Checking configuration...');
  const port = app.get('port');
  const host = app.get('host');
  const mongodb = app.get('mongodb');

  console.log('   Port:', port);
  console.log('   Host:', host);
  console.log('   MongoDB:', mongodb);
  console.log('   ✓ Configuration loaded\n');

  // Test 6: Try to connect to MongoDB
  console.log('6. Testing MongoDB connection...');
  const mongoose = require('mongoose');

  mongoose.connect(mongodb, {
    serverSelectionTimeoutMS: 5000
  }).then(() => {
    console.log('   ✓ MongoDB connection successful!\n');
    console.log('✅ All tests passed! Backend is ready to start.\n');
    console.log('To start the backend, run:');
    console.log('   npm start     (production)');
    console.log('   npm run dev   (development with nodemon)\n');
    process.exit(0);
  }).catch(err => {
    console.error('   ✗ MongoDB connection failed:', err.message);
    console.log('\n⚠ MongoDB is not running or not accessible.');
    console.log('Please start MongoDB first:\n');
    console.log('   mongod --dbpath C:\\data\\db\n');
    process.exit(1);
  });

} catch (err) {
  console.error('   ✗ Failed to load application:', err.message);
  console.error('\nError details:', err);
  process.exit(1);
}

