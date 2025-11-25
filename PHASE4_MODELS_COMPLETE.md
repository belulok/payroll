# 🎉 Phase 4: Multi-Payment Type System - Models Complete!

## ✅ What Was Built

I've created the complete database schema for your **3-tier payment system** with all supporting features!

---

## 📊 **Payment Types Supported**

### **Type 1: Monthly Salary (9-5 System)**
- ✅ Fixed monthly salary
- ✅ Gazetted holidays support
- ✅ Leave management with tiered allocation
- ✅ Multiple leave types (Annual, Sick, Emergency, etc.)
- ✅ Leave balance tracking
- ✅ Leave request approval workflow
- ✅ Carry forward rules

### **Type 2: Hourly Pay**
- ✅ Hourly rate calculation
- ✅ QR code check-in/check-out
- ✅ GPS location tracking
- ✅ Photo attendance proof
- ✅ Only company can manually edit timesheets
- ✅ Edit history tracking
- ✅ Overtime calculation (1.5x, 2.0x)

### **Type 3: Unit-Based Pay**
- ✅ Pay per unit/piece produced
- ✅ Multiple unit types support
- ✅ Quality control (rejected units)
- ✅ Quality score tracking
- ✅ Photo evidence support
- ✅ Verification workflow
- ✅ Approval workflow

---

## 📁 **New Models Created**

### **1. Leave Type Model** (`leave-type.model.js`)
```javascript
{
  company: ObjectId,
  name: "Annual Leave",
  code: "AL",
  isPaid: true,
  requiresApproval: true,
  
  // Tiered Allocation
  useTiers: true,
  tiers: [
    { tierName: "Junior", daysAllowed: 12 },
    { tierName: "Senior", daysAllowed: 18 },
    { tierName: "Manager", daysAllowed: 24 }
  ],
  
  // Carry Forward
  allowCarryForward: true,
  maxCarryForwardDays: 5
}
```

**Features:**
- Multiple leave types per company
- Tiered allocation (different employees get different amounts)
- Carry forward rules
- Approval requirements
- Document requirements

---

### **2. Leave Balance Model** (`leave-balance.model.js`)
```javascript
{
  company: ObjectId,
  worker: ObjectId,
  leaveType: ObjectId,
  year: 2025,
  totalDays: 18,
  usedDays: 5,
  pendingDays: 2,
  carriedForwardDays: 3,
  remainingDays: 11  // Virtual field
}
```

**Methods:**
- `canTakeLeave(days)` - Check if sufficient balance
- `reserveDays(days)` - Reserve days when request submitted
- `approveDays(days)` - Deduct from balance when approved
- `rejectDays(days)` - Release reserved days when rejected

---

### **3. Leave Request Model** (`leave-request.model.js`)
```javascript
{
  company: ObjectId,
  worker: ObjectId,
  leaveType: ObjectId,
  startDate: "2025-12-01",
  endDate: "2025-12-05",
  totalDays: 5,
  reason: "Family vacation",
  status: "pending",  // pending, approved, rejected, cancelled
  documents: [{ name: "medical-cert.pdf", url: "..." }],
  approvedBy: ObjectId,
  approvedAt: Date
}
```

**Methods:**
- `approve(userId)` - Approve and deduct from balance
- `reject(userId, reason)` - Reject and release reserved days
- `cancel()` - Cancel request

---

### **4. Gazetted Holiday Model** (`gazetted-holiday.model.js`)
```javascript
{
  company: ObjectId,
  name: "Hari Raya Aidilfitri",
  date: "2025-04-01",
  year: 2025,
  type: "public",  // public, company, state-specific
  state: "Selangor",
  isPaid: true,
  isRecurring: true
}
```

**Static Methods:**
- `getHolidaysForDateRange(companyId, startDate, endDate)`
- `isHoliday(companyId, date)`
- `getWorkingDays(companyId, startDate, endDate)` - Excludes weekends & holidays

---

### **5. Unit Record Model** (`unit-record.model.js`)
```javascript
{
  company: ObjectId,
  worker: ObjectId,
  date: "2025-11-24",
  unitType: "Bricks Laid",
  unitsCompleted: 500,
  unitsRejected: 20,
  ratePerUnit: 0.50,
  totalAmount: 240.00,  // (500 - 20) * 0.50
  qualityScore: 95,
  status: "approved",  // draft, submitted, verified, approved, rejected
  photos: [{ url: "..." }],
  project: { name: "Site A", code: "SA-001" }
}
```

**Methods:**
- `submit()` - Submit for verification
- `verify(userId)` - Verify quality
- `approve(userId)` - Approve for payment
- `reject(userId, reason)` - Reject with reason

**Static Methods:**
- `getApprovedUnitsForPeriod(workerId, startDate, endDate)` - For payroll calculation

---

## 🔄 **Updated Models**

### **Company Model** - Added:
```javascript
{
  // Payment types this company uses
  paymentTypes: ['monthly-salary', 'hourly', 'unit-based'],
  
  // QR Code for hourly check-in
  qrCodeSettings: {
    enabled: true,
    qrCode: "COMPANY-QR-12345",
    qrCodeGeneratedAt: Date,
    allowManualEdit: false  // Only company can edit
  },
  
  // Agent relationship (1 agent, multiple companies)
  agent: ObjectId
}
```

---

### **Worker Model** - Added:
```javascript
{
  // Payment type for this worker
  paymentType: 'monthly-salary',  // or 'hourly' or 'unit-based'
  
  // Leave tier (for monthly-salary workers)
  leaveTier: 'Senior',
  
  payrollInfo: {
    // Monthly Salary
    monthlySalary: 5000,
    
    // Hourly Rate
    hourlyRate: 25,
    
    // Unit Rates
    unitRates: [
      { unitType: 'Bricks Laid', ratePerUnit: 0.50 },
      { unitType: 'Tiles Installed', ratePerUnit: 1.20 }
    ]
  }
}
```

---

### **Timesheet Model** - Added:
```javascript
{
  // Check-in method
  checkInMethod: 'qr-code',  // manual, qr-code, gps, photo
  
  // QR Code check-in/out
  qrCodeCheckIn: {
    scanned: true,
    scannedAt: Date,
    scannedBy: ObjectId,
    qrCodeData: "COMPANY-QR-12345"
  },
  qrCodeCheckOut: {
    scanned: true,
    scannedAt: Date,
    scannedBy: ObjectId,
    qrCodeData: "COMPANY-QR-12345"
  },
  
  // Manual edit tracking
  manuallyEdited: false,
  editHistory: [{
    editedBy: ObjectId,
    editedAt: Date,
    field: "clockOut",
    oldValue: "18:00",
    newValue: "18:30",
    reason: "Forgot to clock out"
  }]
}
```

---

## 🎯 **Key Features**

### **Agent-Company Relationship**
- ✅ 1 agent can have multiple companies
- ✅ Agent field added to Company model
- ✅ Frontend can show company dropdown for agents

### **Type 1: Monthly Salary Features**
- ✅ Gazetted holidays calendar
- ✅ Working days calculation (excludes weekends & holidays)
- ✅ Multiple leave types with custom names
- ✅ Tiered leave allocation (Junior: 12 days, Senior: 18 days, etc.)
- ✅ Leave balance tracking per worker per year
- ✅ Leave request approval workflow
- ✅ Carry forward rules

### **Type 2: Hourly Pay Features**
- ✅ QR code generation per company
- ✅ QR code scanning for check-in/check-out
- ✅ Automatic time calculation from QR scans
- ✅ Only company can manually edit timesheets
- ✅ Complete edit history tracking
- ✅ GPS and photo support

### **Type 3: Unit-Based Features**
- ✅ Multiple unit types per worker
- ✅ Quality control with rejection tracking
- ✅ Photo evidence support
- ✅ 3-level approval (Submit → Verify → Approve)
- ✅ Automatic amount calculation

---

## 📋 **Next Steps**

Now you need to:

1. **Update Payroll Calculation Engine** - Modify to handle all 3 payment types
2. **Create FeathersJS Services** - For all new models
3. **Add Hooks** - For business logic and validation
4. **Create Seed Data** - Test data for all 3 payment types
5. **Build Frontend UI** - Forms and dashboards for each type

Would you like me to:
- **A) Update the Payroll Calculation Engine** to handle all 3 types?
- **B) Create FeathersJS Services** for the new models?
- **C) Create seed data** to test the system?
- **D) Build the frontend UI** for managing these features?

Let me know what you'd like next! 🚀

