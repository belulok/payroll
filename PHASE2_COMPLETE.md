# Phase 2: Timesheet Module - COMPLETE! ✅

## Overview

Phase 2 of the Payroll & Timesheet System has been successfully implemented! This phase adds a comprehensive timesheet management system with OT tracking, conflict detection, and multi-level approval workflow.

---

## 🎯 What Was Built

### 1. Timesheet Database Model

#### **Timesheet Model** (`backend/src/models/timesheet.model.js`)

**Core Features:**
- Multi-tenant with company and worker references
- Date and time tracking (date, clockIn, clockOut)
- Hours breakdown (normalHours, ot1_5Hours, ot2_0Hours, totalHours)
- Location tracking (GPS coordinates for clock in/out) - Optional
- Attendance proof (photos, QR codes, documents) - Optional
- Project/Site information
- Work description and notes

**Approval Workflow:**
- Status: `draft`, `submitted`, `approved_subcon`, `approved_admin`, `rejected`, `cancelled`
- Approval history with timestamps and comments
- Multi-level approval chain

**Conflict Detection:**
- Automatic overlap detection
- Conflict flagging (`isConflict`)
- References to conflicting timesheets (`conflictWith`)

**Audit Trail:**
- Created by user
- Last modified by user
- Timestamps (createdAt, updatedAt)
- Soft delete support (`isDeleted`)

**Methods:**
- `overlapsWith(otherTimesheet)` - Check if two timesheets overlap
- `findConflicts(workerId, date, clockIn, clockOut, excludeId)` - Find conflicting timesheets

**Indexes:**
- `{ company: 1, worker: 1, date: 1 }` - Multi-tenant queries
- `{ company: 1, status: 1, date: -1 }` - Status filtering
- `{ worker: 1, date: 1, clockIn: 1, clockOut: 1 }` - Conflict detection

---

### 2. Timesheet Service

#### **TimesheetService** (`backend/src/services/timesheets/timesheets.service.js`)

**CRUD Operations:**
- ✅ **Create** - With automatic conflict detection
- ✅ **Read** - Filtered by company for subcon-admin
- ✅ **Update** - With conflict re-checking
- ✅ **Delete** - Soft delete (sets isDeleted flag)

**Multi-Tenant Isolation:**
- Subcon admins see only their company's timesheets
- System admins see all timesheets
- Automatic company assignment for subcon-admin

**Conflict Detection:**
- Automatic on create
- Re-check on update if time/date changes
- Flags overlapping timesheets
- Stores references to conflicting entries

**Approval Workflow:**
- **Draft** → **Submitted** (by worker/subcon-admin)
- **Submitted** → **Approved by Subcon** (by subcon-admin)
- **Approved by Subcon** → **Approved by Admin** (by system admin)
- **Any status** → **Rejected** (by subcon-admin or admin)

**Custom Endpoints:**
- `POST /timesheets/:id/approve` - Approve timesheet
- `POST /timesheets/:id/reject` - Reject timesheet with comments

**Validation:**
- Worker must belong to company
- Total hours auto-calculated
- Permission checks on all operations

---

## 📊 Timesheet Workflow

```
┌─────────┐
│  DRAFT  │ (Worker creates timesheet)
└────┬────┘
     │
     ▼
┌──────────┐
│SUBMITTED │ (Worker submits for approval)
└────┬─────┘
     │
     ▼
┌────────────────┐
│APPROVED_SUBCON │ (Subcon Admin approves)
└────┬───────────┘
     │
     ▼
┌────────────────┐
│APPROVED_ADMIN  │ (System Admin approves - FINAL)
└────────────────┘

     OR

┌──────────┐
│ REJECTED │ (Can be rejected at any stage)
└──────────┘
```

---

## 🔍 Conflict Detection Algorithm

**How it works:**
1. When creating/updating a timesheet, check for overlaps
2. Find all timesheets for same worker on same date
3. Check if time ranges overlap:
   - New clockIn falls within existing timesheet
   - New clockOut falls within existing timesheet
   - New timesheet completely encompasses existing one
4. If conflicts found:
   - Set `isConflict = true`
   - Store IDs in `conflictWith` array
5. Conflicts are informational - don't block creation

**Example:**
```
Existing: 08:00 - 17:00
New:      16:00 - 20:00  ← CONFLICT! (overlaps 16:00-17:00)

Existing: 08:00 - 17:00
New:      18:00 - 20:00  ← NO CONFLICT
```

---

## 🔐 Test Data

### Test Timesheets Created

**Worker: Ahmad Ibrahim (W001)**
1. **Yesterday** - Status: `submitted`
   - 8 normal hours + 1 OT1.5 hour = 9 total
   - Description: "Foundation work at Site A"

2. **Two days ago** - Status: `approved_subcon`
   - 8 normal hours + 2 OT1.5 hours = 10 total
   - Description: "Concrete pouring"
   - Already approved by subcon admin

**Worker: Kumar Subramaniam (W002)**
1. **Yesterday** - Status: `submitted`
   - 8 normal + 2 OT1.5 + 1.5 OT2.0 = 11.5 total
   - Description: "Site supervision - overtime for urgent work"

**Worker: Lee Wei Ming (W003)**
1. **Yesterday** - Status: `draft`
   - 8 normal + 0.5 OT1.5 = 8.5 total
   - Description: "Electrical wiring installation"

---

## 🚀 How to Use

### 1. Seed Test Data
```bash
cd backend
npm run seed:phase2
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Test API Endpoints

#### **Create Timesheet**
```bash
POST http://localhost:3030/timesheets
Authorization: Bearer <token>
Content-Type: application/json

{
  "worker": "<worker_id>",
  "date": "2025-11-24",
  "clockIn": "2025-11-24T08:00:00Z",
  "clockOut": "2025-11-24T17:00:00Z",
  "normalHours": 8,
  "ot1_5Hours": 1,
  "ot2_0Hours": 0,
  "description": "Construction work",
  "status": "submitted"
}
```

#### **Get All Timesheets** (filtered by company for subcon-admin)
```bash
GET http://localhost:3030/timesheets
Authorization: Bearer <token>
```

#### **Get Timesheets by Status**
```bash
GET http://localhost:3030/timesheets?status=submitted
Authorization: Bearer <token>
```

#### **Get Timesheets by Worker**
```bash
GET http://localhost:3030/timesheets?worker=<worker_id>
Authorization: Bearer <token>
```

#### **Get Timesheets by Date Range**
```bash
GET http://localhost:3030/timesheets?date[$gte]=2025-11-01&date[$lte]=2025-11-30
Authorization: Bearer <token>
```

#### **Approve Timesheet** (as subcon-admin)
```bash
POST http://localhost:3030/timesheets/<timesheet_id>/approve
Authorization: Bearer <subcon_admin_token>
Content-Type: application/json

{
  "comments": "Approved - good work"
}
```

#### **Approve Timesheet** (as admin - final approval)
```bash
POST http://localhost:3030/timesheets/<timesheet_id>/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "comments": "Final approval"
}
```

#### **Reject Timesheet**
```bash
POST http://localhost:3030/timesheets/<timesheet_id>/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "comments": "Hours don't match - please revise"
}
```

#### **Update Timesheet**
```bash
PATCH http://localhost:3030/timesheets/<timesheet_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "normalHours": 7,
  "ot1_5Hours": 2,
  "description": "Updated description"
}
```

---

## ✅ Phase 2 Checklist

- [x] Timesheet model with OT tracking
- [x] Multi-tenant data isolation
- [x] Conflict detection algorithm
- [x] Multi-level approval workflow
- [x] Approval history tracking
- [x] Custom approve/reject endpoints
- [x] Location tracking support (GPS)
- [x] Attendance proof support (photos/QR)
- [x] Audit trail (created by, modified by)
- [x] Soft delete support
- [x] Seed script with test data
- [ ] Frontend UI (Phase 2 backend complete, UI pending)
- [ ] GPS/QR implementation (schema ready, implementation pending)

---

## 📝 Files Created/Modified

### New Files:
1. `backend/src/models/timesheet.model.js` - Timesheet model
2. `backend/src/services/timesheets/timesheets.service.js` - Timesheet service
3. `backend/seed-phase2.js` - Phase 2 seed script
4. `PHASE2_COMPLETE.md` - This file

### Modified Files:
1. `backend/src/services/index.js` - Registered timesheet service
2. `backend/package.json` - Added seed:phase2 script

---

## 🎯 Next Steps (Phase 3)

Ready to move to **Phase 3: Payroll Engine**:
- Hourly rate calculations
- OT multipliers (1.5x, 2.0x)
- EPF/SOCSO/EIS deductions (Malaysian statutory)
- Allowances and deductions
- Payslip generation
- Bulk payroll processing
- Payment status tracking

---

## 💡 Advanced Features (Ready for Implementation)

### GPS Tracking
```javascript
location: {
  clockIn: {
    latitude: 3.1390,
    longitude: 101.6869,
    address: "Kuala Lumpur",
    timestamp: new Date()
  }
}
```

### QR Code Attendance
```javascript
attachments: [{
  type: 'qr_code',
  url: 'https://storage.example.com/qr/12345.png',
  uploadedAt: new Date()
}]
```

---

**Phase 2 Status: BACKEND COMPLETE! ✅**

Backend is fully functional with:
- ✅ Timesheet CRUD operations
- ✅ Conflict detection
- ✅ Multi-level approval workflow
- ✅ Test data seeded

**Ready for:**
1. Frontend UI development
2. Phase 3 (Payroll Engine)
3. GPS/QR implementation

Let me know what you'd like to build next! 🚀

