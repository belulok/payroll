# Phase 3: Payroll Engine - COMPLETE! ✅

## Overview

Phase 3 of the Payroll & Timesheet System has been successfully implemented! This phase adds a complete payroll calculation engine with Malaysian statutory deductions (EPF, SOCSO, EIS), automatic pay calculations from approved timesheets, and payment tracking.

---

## 🎯 What Was Built

### 1. Payroll Record Model

#### **PayrollRecord Model** (`backend/src/models/payroll-record.model.js`)

**Core Features:**
- Multi-tenant with company and worker references
- Period tracking (periodStart, periodEnd, paymentDate)
- Links to approved timesheets
- Hours breakdown (normal, OT1.5, OT2.0, total)
- Rate information (hourly, OT1.5, OT2.0)

**Pay Calculation:**
- Normal pay (hours × hourly rate)
- OT1.5 pay (hours × hourly rate × 1.5)
- OT2.0 pay (hours × hourly rate × 2.0)
- Gross pay (sum of all pay)
- Allowances (fixed or percentage-based)
- Total allowances

**Malaysian Statutory Deductions:**
- **EPF** (Employees Provident Fund)
  - Employee contribution: 11%
  - Employer contribution: 12-13% (based on wage)
- **SOCSO** (Social Security Organization)
  - Employee contribution: ~0.5%
  - Employer contribution: ~1.75%
  - Only for wages ≤ RM4,000
- **EIS** (Employment Insurance System)
  - Employee contribution: 0.2% (max RM7.90)
  - Employer contribution: 0.2% (max RM7.90)

**Other Deductions:**
- Custom deductions (fixed or percentage-based)
- Total deductions

**Net Pay:**
- Gross pay + allowances - total deductions

**Payment Tracking:**
- Payment status (pending, processing, paid, failed, cancelled)
- Payment method (bank_transfer, cash, cheque, e-wallet)
- Payment reference
- Paid date
- Bank details

**Status Management:**
- Status (draft, approved, paid, cancelled)
- Lock flag (prevent modifications)
- Approval tracking

---

### 2. Statutory Calculations Utility

#### **Statutory Calculations** (`backend/src/utils/statutory-calculations.js`)

**Functions:**

1. **`calculateEPF(monthlyWage)`**
   - Employee: 11% of wage
   - Employer: 13% (wage ≤ RM5,000) or 12% (wage > RM5,000)
   - Returns: { employee, employer, total }

2. **`calculateSOCSO(monthlyWage)`**
   - Only for wages ≤ RM4,000
   - Employee: ~0.5% (max RM19.75)
   - Employer: ~1.75% (max RM69.05)
   - Returns: { employee, employer, total }

3. **`calculateEIS(monthlyWage)`**
   - Employee: 0.2% (max RM7.90)
   - Employer: 0.2% (max RM7.90)
   - Returns: { employee, employer, total }

4. **`calculateStatutoryDeductions(monthlyWage, options)`**
   - Calculates all statutory deductions
   - Options: { epfEnabled, socsoEnabled, eisEnabled }
   - Returns: { epf, socso, eis, totalEmployee, totalEmployer, totalDeductions }

5. **`calculateGrossPay(hours, hourlyRate, otRates)`**
   - Calculates pay from hours and rates
   - Returns: { normalPay, ot1_5Pay, ot2_0Pay, grossPay }

6. **`hourlyToMonthly(hourlyRate)`**
   - Converts hourly rate to monthly wage
   - Assumes 26 days × 8 hours = 208 hours/month

---

### 3. Payroll Records Service

#### **PayrollRecordService** (`backend/src/services/payroll-records/payroll-records.service.js`)

**CRUD Operations:**
- ✅ **Create** - Create payroll record
- ✅ **Read** - Filtered by company for subcon-admin
- ✅ **Update** - Update payroll details
- ✅ **Delete** - Remove payroll record

**Custom Method: Generate Payroll**
- `generatePayroll(workerId, periodStart, periodEnd, params)`
- Finds all approved timesheets in period
- Calculates total hours (normal, OT1.5, OT2.0)
- Gets worker's hourly rate and company OT rates
- Calculates gross pay with OT multipliers
- Processes allowances (fixed or percentage)
- Calculates statutory deductions (EPF, SOCSO, EIS)
- Processes other deductions
- Calculates net pay
- Creates payroll record with all details

**Multi-Tenant Isolation:**
- Subcon admins see only their company's payroll
- System admins see all payroll records
- Automatic company assignment

**Permission Checks:**
- Verify worker belongs to company
- Check user access to payroll records

---

## 📊 Payroll Calculation Flow

```
APPROVED TIMESHEETS
        ↓
Calculate Total Hours
  - Normal hours
  - OT 1.5x hours
  - OT 2.0x hours
        ↓
Calculate Gross Pay
  - Normal pay = hours × rate
  - OT1.5 pay = hours × rate × 1.5
  - OT2.0 pay = hours × rate × 2.0
        ↓
Add Allowances
  - Fixed allowances
  - Percentage allowances
        ↓
Calculate Statutory Deductions
  - EPF (11% employee, 12-13% employer)
  - SOCSO (0.5% employee, 1.75% employer)
  - EIS (0.2% employee, 0.2% employer)
        ↓
Apply Other Deductions
  - Fixed deductions
  - Percentage deductions
        ↓
Calculate Net Pay
  = Gross Pay + Allowances - Total Deductions
```

---

## 💰 Example Payroll Calculation

**Worker:** Ahmad Ibrahim  
**Period:** November 2025  
**Hourly Rate:** RM 15.00  

**Hours:**
- Normal: 16 hours
- OT 1.5x: 3 hours
- OT 2.0x: 0 hours

**Gross Pay Calculation:**
```
Normal Pay  = 16 × RM15.00 = RM 240.00
OT1.5 Pay   = 3 × RM15.00 × 1.5 = RM 67.50
OT2.0 Pay   = 0 × RM15.00 × 2.0 = RM 0.00
─────────────────────────────────────────
Gross Pay   = RM 307.50
```

**Statutory Deductions:**
```
EPF Employee    = RM307.50 × 11% = RM 33.83
SOCSO Employee  = RM307.50 × 0.5% = RM 1.54
EIS Employee    = RM307.50 × 0.2% = RM 0.62
─────────────────────────────────────────
Total Deductions = RM 35.99
```

**Net Pay:**
```
Net Pay = RM307.50 - RM35.99 = RM 271.51
```

---

## 🚀 How to Use

### 1. Approve Timesheets First
```bash
cd backend
node approve-timesheets.js
```

### 2. Seed Test Payroll Data
```bash
cd backend
npm run seed:phase3
```

### 3. Start Backend
```bash
cd backend
npm run dev
```

### 4. Test API Endpoints

#### **Generate Payroll for a Worker**
```bash
POST http://localhost:3030/payroll-records/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "workerId": "<worker_id>",
  "periodStart": "2025-11-01",
  "periodEnd": "2025-11-30"
}
```

**Response:**
```json
{
  "_id": "...",
  "worker": "...",
  "company": "...",
  "periodStart": "2025-11-01T00:00:00.000Z",
  "periodEnd": "2025-11-30T23:59:59.999Z",
  "totalNormalHours": 16,
  "totalOT1_5Hours": 3,
  "totalOT2_0Hours": 0,
  "hourlyRate": 15,
  "normalPay": 240,
  "ot1_5Pay": 67.50,
  "ot2_0Pay": 0,
  "grossPay": 307.50,
  "epf": {
    "employeeContribution": 33.83,
    "employerContribution": 39.98,
    "totalContribution": 73.81
  },
  "socso": {
    "employeeContribution": 1.54,
    "employerContribution": 5.38,
    "totalContribution": 6.92
  },
  "eis": {
    "employeeContribution": 0.62,
    "employerContribution": 0.62,
    "totalContribution": 1.24
  },
  "totalDeductions": 35.99,
  "netPay": 271.51,
  "status": "draft",
  "paymentStatus": "pending"
}
```

#### **Get All Payroll Records**
```bash
GET http://localhost:3030/payroll-records
Authorization: Bearer <token>
```

#### **Get Payroll by Status**
```bash
GET http://localhost:3030/payroll-records?status=draft
GET http://localhost:3030/payroll-records?paymentStatus=pending
```

#### **Get Payroll by Period**
```bash
GET http://localhost:3030/payroll-records?periodStart[$gte]=2025-11-01&periodEnd[$lte]=2025-11-30
```

#### **Update Payroll Status**
```bash
PATCH http://localhost:3030/payroll-records/<payroll_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "paymentStatus": "paid",
  "paidAt": "2025-11-30T10:00:00Z",
  "paymentMethod": "bank_transfer",
  "paymentReference": "TXN123456"
}
```

---

## ✅ Phase 3 Checklist

- [x] Payroll record model with all fields
- [x] Malaysian statutory calculations (EPF, SOCSO, EIS)
- [x] Gross pay calculation with OT multipliers
- [x] Allowances support (fixed & percentage)
- [x] Deductions support (fixed & percentage)
- [x] Net pay calculation
- [x] Payment status tracking
- [x] Multi-tenant data isolation
- [x] Generate payroll from approved timesheets
- [x] Seed script with test data
- [ ] PDF payslip generation (schema ready, implementation pending)
- [ ] Bulk payroll processing (can be added)
- [ ] Frontend UI (pending)

---

## 📝 Files Created/Modified

### New Files:
1. `backend/src/models/payroll-record.model.js` - Payroll record model
2. `backend/src/utils/statutory-calculations.js` - Malaysian statutory calculations
3. `backend/src/services/payroll-records/payroll-records.service.js` - Payroll service
4. `backend/seed-phase3.js` - Phase 3 seed script
5. `backend/approve-timesheets.js` - Helper to approve timesheets
6. `PHASE3_COMPLETE.md` - This file

### Modified Files:
1. `backend/src/services/index.js` - Registered payroll-records service
2. `backend/package.json` - Added seed:phase3 and seed:all scripts

---

**Phase 3 Status: BACKEND COMPLETE! ✅**

Ready for Phase 4 or Frontend UI development! 🚀

