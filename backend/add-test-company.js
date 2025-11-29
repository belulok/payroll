const mongoose = require('mongoose');
require('dotenv').config();

// Import the company model
require('./src/models/company.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

async function addTestCompany() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Company = mongoose.model('companies');

    // Create a second test company
    const newCompany = await Company.create({
      name: 'XYZ Engineering Sdn Bhd',
      registrationNumber: 'ROC-111222333',
      email: 'contact@xyzengineering.com',
      phone: '+60198765432',
      address: {
        street: '789 Jalan Sultan Ismail',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan',
        postcode: '50250',
        country: 'Malaysia'
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
      qrCodeSettings: {
        enabled: true,
        qrCode: 'QR-XYZ67890',
        qrCodeGeneratedAt: new Date(),
        allowManualEdit: false
      },
      isActive: true
    });

    console.log('✅ Test company created successfully!');
    console.log('Company ID:', newCompany._id);
    console.log('Company Name:', newCompany.name);
    console.log('QR Code:', newCompany.qrCodeSettings.qrCode);

    // List all companies
    const allCompanies = await Company.find({});
    console.log('\n📋 All Companies:');
    allCompanies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name} (ID: ${company._id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addTestCompany();

