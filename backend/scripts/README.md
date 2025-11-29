# Organization Data Seeding Script

This script populates your database with comprehensive sample data for the organizational structure.

## What it creates:

### Job Bands (5 levels)
1. **Executive** (EXEC) - C-level executives and top leadership
2. **Senior Management** (SM) - Senior managers and directors
3. **Middle Management** (MM) - Department managers and team leads
4. **Professional** (PROF) - Professional individual contributors
5. **Support Staff** (SUPP) - Administrative and support roles

### Job Grades (11 grades with salary ranges)
- **E1, E2** - Executive grades ($150K-$300K)
- **SM1, SM2** - Senior Management grades ($100K-$150K)
- **M1, M2** - Middle Management grades ($65K-$100K)
- **P1, P2, P3** - Professional grades ($45K-$90K)
- **S1, S2** - Support Staff grades ($30K-$50K)

### Departments (6 departments)
1. Executive Office
2. Human Resources
3. Finance & Accounting
4. Information Technology
5. Sales & Marketing
6. Operations

### Positions (30+ positions)
Comprehensive organizational chart with positions across all departments and levels, including:
- C-Suite (CEO, COO, CFO)
- Directors (HR, Finance, IT, Sales, Operations)
- Managers (various departments)
- Specialists and Individual Contributors
- Support Staff

## How to use:

### 1. Set your Company ID

You need to provide your company ID. You can either:

**Option A: Set environment variable**
```bash
export COMPANY_ID="your-company-id-here"
export MONGODB_URI="mongodb://localhost:27017/payroll"
```

**Option B: Edit the script directly**
Open `seed-organization.js` and replace the default COMPANY_ID on line 10:
```javascript
const COMPANY_ID = 'your-actual-company-id-here';
```

### 2. Run the script

From the backend directory:
```bash
cd backend
node scripts/seed-organization.js
```

### 3. Verify the data

The script will output a summary showing how many records were created:
```
✅ Organization data seeded successfully!

Summary:
- 5 Job Bands
- 11 Job Grades
- 6 Departments
- 30 Positions
```

## Important Notes:

⚠️ **Warning**: This script will **DELETE ALL EXISTING** organization data for the specified company before creating new data. Make sure you have a backup if needed.

## Finding your Company ID:

You can find your company ID by:
1. Logging into the application
2. Opening browser DevTools (F12)
3. Going to Application > Local Storage
4. Looking for the `user` object which contains the company ID

Or query your database directly:
```javascript
db.companies.find()
```

## Customization:

Feel free to modify the script to:
- Add more departments
- Create additional positions
- Adjust salary ranges
- Add custom job bands or grades
- Include department hierarchies (parent departments)
- Add position reporting relationships

The script is well-commented and easy to customize for your specific organizational structure.

