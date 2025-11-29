const mongoose = require('mongoose');
const Department = require('../src/models/department.model');
const Position = require('../src/models/position.model');
const JobBand = require('../src/models/job-band.model');
const JobGrade = require('../src/models/job-grade.model');
const Company = require('../src/models/company.model');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payroll';

async function seedOrganization() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the first company from the database
    console.log('Fetching company...');
    const company = await Company.findOne();

    if (!company) {
      console.error('❌ No company found in database. Please create a company first.');
      process.exit(1);
    }

    const COMPANY_ID = company._id.toString();
    console.log(`✓ Using company: ${company.name} (ID: ${COMPANY_ID})`);

    // Clear existing data for this company
    console.log('Clearing existing organization data...');
    await Department.deleteMany({ company: COMPANY_ID });
    await Position.deleteMany({ company: COMPANY_ID });
    await JobBand.deleteMany({ company: COMPANY_ID });
    await JobGrade.deleteMany({ company: COMPANY_ID });

    // Create Job Bands
    console.log('Creating job bands...');
    const jobBands = await JobBand.insertMany([
      {
        company: COMPANY_ID,
        name: 'Executive',
        code: 'EXEC',
        level: 1,
        description: 'C-level executives and top leadership',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Senior Management',
        code: 'SM',
        level: 2,
        description: 'Senior managers and directors',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Middle Management',
        code: 'MM',
        level: 3,
        description: 'Department managers and team leads',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Professional',
        code: 'PROF',
        level: 4,
        description: 'Professional individual contributors',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Support Staff',
        code: 'SUPP',
        level: 5,
        description: 'Administrative and support roles',
        isActive: true
      }
    ]);
    console.log(`Created ${jobBands.length} job bands`);

    // Create Job Grades
    console.log('Creating job grades...');
    const jobGrades = await JobGrade.insertMany([
      // Executive Grades
      { company: COMPANY_ID, name: 'E1', code: 'E1', jobBand: jobBands[0]._id, level: 1,
        salaryRange: { min: 200000, max: 300000, currency: 'USD' }, isActive: true },
      { company: COMPANY_ID, name: 'E2', code: 'E2', jobBand: jobBands[0]._id, level: 2,
        salaryRange: { min: 150000, max: 200000, currency: 'USD' }, isActive: true },

      // Senior Management Grades
      { company: COMPANY_ID, name: 'SM1', code: 'SM1', jobBand: jobBands[1]._id, level: 1,
        salaryRange: { min: 120000, max: 150000, currency: 'USD' }, isActive: true },
      { company: COMPANY_ID, name: 'SM2', code: 'SM2', jobBand: jobBands[1]._id, level: 2,
        salaryRange: { min: 100000, max: 120000, currency: 'USD' }, isActive: true },

      // Middle Management Grades
      { company: COMPANY_ID, name: 'M1', code: 'M1', jobBand: jobBands[2]._id, level: 1,
        salaryRange: { min: 80000, max: 100000, currency: 'USD' }, isActive: true },
      { company: COMPANY_ID, name: 'M2', code: 'M2', jobBand: jobBands[2]._id, level: 2,
        salaryRange: { min: 65000, max: 80000, currency: 'USD' }, isActive: true },

      // Professional Grades
      { company: COMPANY_ID, name: 'P1', code: 'P1', jobBand: jobBands[3]._id, level: 1,
        salaryRange: { min: 70000, max: 90000, currency: 'USD' }, isActive: true },
      { company: COMPANY_ID, name: 'P2', code: 'P2', jobBand: jobBands[3]._id, level: 2,
        salaryRange: { min: 55000, max: 70000, currency: 'USD' }, isActive: true },
      { company: COMPANY_ID, name: 'P3', code: 'P3', jobBand: jobBands[3]._id, level: 3,
        salaryRange: { min: 45000, max: 55000, currency: 'USD' }, isActive: true },

      // Support Staff Grades
      { company: COMPANY_ID, name: 'S1', code: 'S1', jobBand: jobBands[4]._id, level: 1,
        salaryRange: { min: 40000, max: 50000, currency: 'USD' }, isActive: true },
      { company: COMPANY_ID, name: 'S2', code: 'S2', jobBand: jobBands[4]._id, level: 2,
        salaryRange: { min: 30000, max: 40000, currency: 'USD' }, isActive: true },
    ]);
    console.log(`Created ${jobGrades.length} job grades`);

    // Create Departments
    console.log('Creating departments...');
    const departments = await Department.insertMany([
      {
        company: COMPANY_ID,
        name: 'Executive Office',
        code: 'EXEC',
        description: 'Executive leadership and strategic planning',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Human Resources',
        code: 'HR',
        description: 'Employee relations, recruitment, and development',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Finance & Accounting',
        code: 'FIN',
        description: 'Financial planning, accounting, and reporting',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Information Technology',
        code: 'IT',
        description: 'Technology infrastructure and software development',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Sales & Marketing',
        code: 'SALES',
        description: 'Revenue generation and brand management',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Operations',
        code: 'OPS',
        description: 'Day-to-day business operations and logistics',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Customer Service',
        code: 'CS',
        description: 'Customer support and satisfaction',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Legal & Compliance',
        code: 'LEGAL',
        description: 'Legal affairs and regulatory compliance',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Research & Development',
        code: 'RND',
        description: 'Innovation and product development',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Quality Assurance',
        code: 'QA',
        description: 'Quality control and testing',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Procurement',
        code: 'PROC',
        description: 'Purchasing and vendor management',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Facilities Management',
        code: 'FAC',
        description: 'Building maintenance and workplace services',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Business Development',
        code: 'BD',
        description: 'Strategic partnerships and growth initiatives',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Product Management',
        code: 'PM',
        description: 'Product strategy and roadmap',
        isActive: true
      },
      {
        company: COMPANY_ID,
        name: 'Data Analytics',
        code: 'DATA',
        description: 'Business intelligence and data science',
        isActive: true
      }
    ]);
    console.log(`Created ${departments.length} departments`);

    // Create Positions
    console.log('Creating positions...');
    const positions = await Position.insertMany([
      // Executive Office
      {
        company: COMPANY_ID,
        title: 'Chief Executive Officer',
        code: 'CEO',
        department: departments[0]._id,
        jobBand: jobBands[0]._id,
        jobGrade: jobGrades[0]._id,
        description: 'Overall strategic leadership and company direction',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Chief Operating Officer',
        code: 'COO',
        department: departments[0]._id,
        jobBand: jobBands[0]._id,
        jobGrade: jobGrades[1]._id,
        description: 'Oversees daily operations and business processes',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Chief Financial Officer',
        code: 'CFO',
        department: departments[0]._id,
        jobBand: jobBands[0]._id,
        jobGrade: jobGrades[1]._id,
        description: 'Financial strategy and fiscal management',
        isActive: true
      },

      // Human Resources
      {
        company: COMPANY_ID,
        title: 'HR Director',
        code: 'HR-DIR',
        department: departments[1]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Leads HR strategy and people operations',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'HR Manager',
        code: 'HR-MGR',
        department: departments[1]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages HR programs and employee relations',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'HR Specialist',
        code: 'HR-SPEC',
        department: departments[1]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Handles recruitment, onboarding, and HR administration',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'HR Assistant',
        code: 'HR-ASST',
        department: departments[1]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Provides administrative support to HR team',
        isActive: true
      },

      // Finance & Accounting
      {
        company: COMPANY_ID,
        title: 'Finance Director',
        code: 'FIN-DIR',
        department: departments[2]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Oversees financial planning and analysis',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Accounting Manager',
        code: 'ACC-MGR',
        department: departments[2]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages accounting operations and reporting',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Accountant',
        code: 'SR-ACC',
        department: departments[2]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Handles complex accounting tasks and reconciliations',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Accountant',
        code: 'ACC',
        department: departments[2]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Performs general accounting duties',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Accounts Payable Clerk',
        code: 'AP-CLK',
        department: departments[2]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Processes invoices and vendor payments',
        isActive: true
      },

      // Information Technology
      {
        company: COMPANY_ID,
        title: 'IT Director',
        code: 'IT-DIR',
        department: departments[3]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Leads technology strategy and infrastructure',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Engineering Manager',
        code: 'ENG-MGR',
        department: departments[3]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages software development teams',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Software Engineer',
        code: 'SR-SWE',
        department: departments[3]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Designs and develops complex software systems',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Software Engineer',
        code: 'SWE',
        department: departments[3]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Develops and maintains software applications',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Junior Software Engineer',
        code: 'JR-SWE',
        department: departments[3]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[8]._id,
        description: 'Entry-level software development',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'IT Support Specialist',
        code: 'IT-SUPP',
        department: departments[3]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Provides technical support to employees',
        isActive: true
      },

      // Sales & Marketing
      {
        company: COMPANY_ID,
        title: 'Sales Director',
        code: 'SALES-DIR',
        department: departments[4]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Leads sales strategy and revenue growth',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Marketing Manager',
        code: 'MKT-MGR',
        department: departments[4]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages marketing campaigns and brand strategy',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Sales Manager',
        code: 'SALES-MGR',
        department: departments[4]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[5]._id,
        description: 'Manages sales team and customer relationships',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Sales Executive',
        code: 'SR-SALES',
        department: departments[4]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Handles key accounts and complex sales',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Sales Executive',
        code: 'SALES-EXEC',
        department: departments[4]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Generates new business and manages client relationships',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Marketing Coordinator',
        code: 'MKT-COORD',
        department: departments[4]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Coordinates marketing activities and events',
        isActive: true
      },

      // Operations
      {
        company: COMPANY_ID,
        title: 'Operations Director',
        code: 'OPS-DIR',
        department: departments[5]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Oversees operational efficiency and processes',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Operations Manager',
        code: 'OPS-MGR',
        department: departments[5]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages daily operations and logistics',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Operations Coordinator',
        code: 'OPS-COORD',
        department: departments[5]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Coordinates operational activities',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Administrative Assistant',
        code: 'ADMIN-ASST',
        department: departments[5]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[10]._id,
        description: 'Provides general administrative support',
        isActive: true
      },

      // Customer Service
      {
        company: COMPANY_ID,
        title: 'Customer Service Director',
        code: 'CS-DIR',
        department: departments[6]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[3]._id,
        description: 'Leads customer service strategy and operations',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Customer Service Manager',
        code: 'CS-MGR',
        department: departments[6]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[5]._id,
        description: 'Manages customer service team and quality',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Customer Service Representative',
        code: 'SR-CSR',
        department: departments[6]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Handles escalated customer issues',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Customer Service Representative',
        code: 'CSR',
        department: departments[6]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Provides frontline customer support',
        isActive: true
      },

      // Legal & Compliance
      {
        company: COMPANY_ID,
        title: 'General Counsel',
        code: 'GC',
        department: departments[7]._id,
        jobBand: jobBands[0]._id,
        jobGrade: jobGrades[1]._id,
        description: 'Chief legal officer and compliance oversight',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Legal Manager',
        code: 'LEGAL-MGR',
        department: departments[7]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages legal matters and contracts',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Compliance Officer',
        code: 'COMP-OFF',
        department: departments[7]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Ensures regulatory compliance',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Legal Assistant',
        code: 'LEGAL-ASST',
        department: departments[7]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Supports legal team with documentation',
        isActive: true
      },

      // Research & Development
      {
        company: COMPANY_ID,
        title: 'R&D Director',
        code: 'RND-DIR',
        department: departments[8]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Leads research and innovation initiatives',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Research Manager',
        code: 'RES-MGR',
        department: departments[8]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages research projects and teams',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Research Scientist',
        code: 'SR-SCI',
        department: departments[8]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Conducts advanced research and development',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Research Scientist',
        code: 'SCI',
        department: departments[8]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Performs research and experiments',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Research Assistant',
        code: 'RES-ASST',
        department: departments[8]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Supports research activities',
        isActive: true
      },

      // Quality Assurance
      {
        company: COMPANY_ID,
        title: 'QA Director',
        code: 'QA-DIR',
        department: departments[9]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[3]._id,
        description: 'Oversees quality assurance strategy',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'QA Manager',
        code: 'QA-MGR',
        department: departments[9]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[5]._id,
        description: 'Manages QA processes and team',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior QA Engineer',
        code: 'SR-QA',
        department: departments[9]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Leads testing and quality initiatives',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'QA Engineer',
        code: 'QA-ENG',
        department: departments[9]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Performs testing and quality checks',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'QA Tester',
        code: 'QA-TEST',
        department: departments[9]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Executes test cases and reports bugs',
        isActive: true
      },

      // Procurement
      {
        company: COMPANY_ID,
        title: 'Procurement Director',
        code: 'PROC-DIR',
        department: departments[10]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[3]._id,
        description: 'Leads procurement strategy and vendor relations',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Procurement Manager',
        code: 'PROC-MGR',
        department: departments[10]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[5]._id,
        description: 'Manages purchasing and supplier relationships',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Buyer',
        code: 'SR-BUYER',
        department: departments[10]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Handles strategic purchasing decisions',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Buyer',
        code: 'BUYER',
        department: departments[10]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Purchases goods and services',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Procurement Assistant',
        code: 'PROC-ASST',
        department: departments[10]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[10]._id,
        description: 'Supports procurement operations',
        isActive: true
      },

      // Facilities Management
      {
        company: COMPANY_ID,
        title: 'Facilities Director',
        code: 'FAC-DIR',
        department: departments[11]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[3]._id,
        description: 'Oversees facilities and workplace services',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Facilities Manager',
        code: 'FAC-MGR',
        department: departments[11]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[5]._id,
        description: 'Manages building maintenance and services',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Maintenance Supervisor',
        code: 'MAINT-SUP',
        department: departments[11]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Supervises maintenance staff and activities',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Maintenance Technician',
        code: 'MAINT-TECH',
        department: departments[11]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[9]._id,
        description: 'Performs building maintenance and repairs',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Receptionist',
        code: 'RECEP',
        department: departments[11]._id,
        jobBand: jobBands[4]._id,
        jobGrade: jobGrades[10]._id,
        description: 'Manages front desk and visitor services',
        isActive: true
      },

      // Business Development
      {
        company: COMPANY_ID,
        title: 'Business Development Director',
        code: 'BD-DIR',
        department: departments[12]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Leads strategic partnerships and growth',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Business Development Manager',
        code: 'BD-MGR',
        department: departments[12]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Identifies and develops new business opportunities',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Partnership Manager',
        code: 'PART-MGR',
        department: departments[12]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Manages strategic partnerships',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Business Analyst',
        code: 'BIZ-ANAL',
        department: departments[12]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Analyzes business opportunities and market trends',
        isActive: true
      },

      // Product Management
      {
        company: COMPANY_ID,
        title: 'Chief Product Officer',
        code: 'CPO',
        department: departments[13]._id,
        jobBand: jobBands[0]._id,
        jobGrade: jobGrades[1]._id,
        description: 'Leads product strategy and vision',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Product Director',
        code: 'PROD-DIR',
        department: departments[13]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Oversees product portfolio and roadmap',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Product Manager',
        code: 'SR-PM',
        department: departments[13]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Manages complex product initiatives',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Product Manager',
        code: 'PM',
        department: departments[13]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Defines and delivers product features',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Associate Product Manager',
        code: 'APM',
        department: departments[13]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[8]._id,
        description: 'Supports product development and launches',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Product Owner',
        code: 'PO',
        department: departments[13]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Manages product backlog and priorities',
        isActive: true
      },

      // Data Analytics
      {
        company: COMPANY_ID,
        title: 'Chief Data Officer',
        code: 'CDO',
        department: departments[14]._id,
        jobBand: jobBands[0]._id,
        jobGrade: jobGrades[1]._id,
        description: 'Leads data strategy and analytics',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Data Analytics Director',
        code: 'DATA-DIR',
        department: departments[14]._id,
        jobBand: jobBands[1]._id,
        jobGrade: jobGrades[2]._id,
        description: 'Oversees data analytics and BI initiatives',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Senior Data Scientist',
        code: 'SR-DS',
        department: departments[14]._id,
        jobBand: jobBands[2]._id,
        jobGrade: jobGrades[4]._id,
        description: 'Leads advanced analytics and ML projects',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Data Scientist',
        code: 'DS',
        department: departments[14]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Develops predictive models and insights',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Data Analyst',
        code: 'DATA-ANAL',
        department: departments[14]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Analyzes data and creates reports',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'BI Developer',
        code: 'BI-DEV',
        department: departments[14]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[7]._id,
        description: 'Develops dashboards and BI solutions',
        isActive: true
      },
      {
        company: COMPANY_ID,
        title: 'Data Engineer',
        code: 'DATA-ENG',
        department: departments[14]._id,
        jobBand: jobBands[3]._id,
        jobGrade: jobGrades[6]._id,
        description: 'Builds and maintains data pipelines',
        isActive: true
      }
    ]);
    console.log(`Created ${positions.length} positions`);

    console.log('\n✅ Organization data seeded successfully!');
    console.log(`\nSummary:`);
    console.log(`- ${jobBands.length} Job Bands`);
    console.log(`- ${jobGrades.length} Job Grades`);
    console.log(`- ${departments.length} Departments`);
    console.log(`- ${positions.length} Positions`);

  } catch (error) {
    console.error('Error seeding organization data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the seed function
seedOrganization();

