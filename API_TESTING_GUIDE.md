# API Testing Guide - Phase 1

Quick guide to test the Phase 1 APIs using curl, Postman, or any HTTP client.

---

## Prerequisites

1. **Backend running:** `cd backend && npm run dev`
2. **Test data seeded:** `cd backend && npm run seed:phase1`
3. **MongoDB running:** `mongod --dbpath C:\data\db`

---

## 1. Authentication

### Login as System Admin
```bash
POST http://localhost:3030/authentication
Content-Type: application/json

{
  "strategy": "local",
  "email": "admin@payroll.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authentication": {
    "strategy": "local"
  },
  "user": {
    "_id": "...",
    "email": "admin@payroll.com",
    "role": "admin",
    ...
  }
}
```

### Login as Subcon Admin
```bash
POST http://localhost:3030/authentication
Content-Type: application/json

{
  "strategy": "local",
  "email": "subcon.admin@example.com",
  "password": "subcon123"
}
```

---

## 2. Company/Subcon APIs

### Get All Companies (Admin only)
```bash
GET http://localhost:3030/companies
Authorization: Bearer <admin_token>
```

### Get Single Company
```bash
GET http://localhost:3030/companies/<company_id>
Authorization: Bearer <token>
```

### Create New Company (Admin only)
```bash
POST http://localhost:3030/companies
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "XYZ Engineering Sdn Bhd",
  "email": "xyz@example.com",
  "phone": "+60123456789",
  "subscription": {
    "plan": "basic"
  }
}
```

### Update Company
```bash
PATCH http://localhost:3030/companies/<company_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+60198765432",
  "payrollSettings": {
    "overtimeRates": {
      "ot1_5": 1.5,
      "ot2_0": 2.5
    }
  }
}
```

---

## 3. Worker APIs

### Get All Workers (Filtered by company for subcon-admin)
```bash
GET http://localhost:3030/workers
Authorization: Bearer <token>
```

**As Subcon Admin:** Returns only workers from their company
**As System Admin:** Returns all workers

### Get Single Worker
```bash
GET http://localhost:3030/workers/<worker_id>
Authorization: Bearer <token>
```

### Create Worker
```bash
POST http://localhost:3030/workers
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "W004",
  "firstName": "Siti",
  "lastName": "Aminah",
  "email": "siti@example.com",
  "phone": "+60123456704",
  "icNumber": "880808-08-8888",
  "position": "Plumber",
  "department": "Plumbing",
  "payrollInfo": {
    "hourlyRate": 18.00,
    "currency": "MYR",
    "epfNumber": "EPF004",
    "socsoNumber": "SOCSO004"
  }
}
```

**Note:** If logged in as subcon-admin, company is automatically set to their company.

### Update Worker
```bash
PATCH http://localhost:3030/workers/<worker_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "position": "Senior Plumber",
  "payrollInfo": {
    "hourlyRate": 22.00
  }
}
```

### Delete Worker (Soft delete - sets isActive to false)
```bash
DELETE http://localhost:3030/workers/<worker_id>
Authorization: Bearer <token>
```

---

## 4. Bulk Worker Import

### Import Multiple Workers
```bash
POST http://localhost:3030/workers/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "workers": [
    {
      "employeeId": "W005",
      "firstName": "Ali",
      "lastName": "Hassan",
      "position": "Helper",
      "payrollInfo": { "hourlyRate": 12.00 }
    },
    {
      "employeeId": "W006",
      "firstName": "Muthu",
      "lastName": "Raman",
      "position": "Helper",
      "payrollInfo": { "hourlyRate": 12.00 }
    }
  ]
}
```

**Response:**
```json
{
  "success": [
    { "_id": "...", "employeeId": "W005", ... },
    { "_id": "...", "employeeId": "W006", ... }
  ],
  "failed": []
}
```

---

## 5. Query Parameters

### Pagination
```bash
GET http://localhost:3030/workers?$limit=10&$skip=0
```

### Filtering
```bash
# Active workers only
GET http://localhost:3030/workers?isActive=true

# By position
GET http://localhost:3030/workers?position=Electrician

# By employment status
GET http://localhost:3030/workers?employmentStatus=active
```

### Sorting
```bash
# Sort by name ascending
GET http://localhost:3030/workers?$sort[firstName]=1

# Sort by hourly rate descending
GET http://localhost:3030/workers?$sort[payrollInfo.hourlyRate]=-1
```

### Population (Join)
```bash
# Populate company details
GET http://localhost:3030/workers?$populate=company

# Populate user account
GET http://localhost:3030/workers?$populate=user
```

---

## 6. Testing Scenarios

### Scenario 1: Subcon Admin Creates Worker
1. Login as subcon admin
2. Create worker (company auto-assigned)
3. Verify worker appears in their worker list
4. Try to access another company's worker (should fail)

### Scenario 2: Worker Limit Enforcement
1. Login as subcon admin (Standard plan = 50 workers max)
2. Create workers until limit reached
3. Try to create one more (should fail with error message)

### Scenario 3: System Admin Access
1. Login as system admin
2. View all companies
3. View all workers across all companies
4. Create/update any company or worker

---

## 7. Error Responses

### Unauthorized (No token)
```json
{
  "name": "NotAuthenticated",
  "message": "Not authenticated",
  "code": 401
}
```

### Forbidden (Wrong permissions)
```json
{
  "message": "Unauthorized access to worker"
}
```

### Worker Limit Reached
```json
{
  "message": "Worker limit reached. Current plan allows 50 workers."
}
```

### Validation Error
```json
{
  "name": "BadRequest",
  "message": "Validation failed",
  "errors": { ... }
}
```

---

## 8. Postman Collection

You can import this into Postman:

**Base URL:** `http://localhost:3030`

**Environment Variables:**
- `base_url`: `http://localhost:3030`
- `admin_token`: (set after login)
- `subcon_token`: (set after login)
- `company_id`: (set after creating/getting company)
- `worker_id`: (set after creating/getting worker)

---

## Quick Test Commands (PowerShell)

```powershell
# Login as admin
$response = Invoke-RestMethod -Uri "http://localhost:3030/authentication" -Method Post -Body (@{strategy="local"; email="admin@payroll.com"; password="admin123"} | ConvertTo-Json) -ContentType "application/json"
$token = $response.accessToken

# Get all companies
Invoke-RestMethod -Uri "http://localhost:3030/companies" -Headers @{Authorization="Bearer $token"}

# Get all workers
Invoke-RestMethod -Uri "http://localhost:3030/workers" -Headers @{Authorization="Bearer $token"}
```

---

---

## 9. Timesheet APIs (Phase 2)

### Get All Timesheets (Filtered by company for subcon-admin)
```bash
GET http://localhost:3030/timesheets
Authorization: Bearer <token>
```

### Get Timesheets by Status
```bash
# Get submitted timesheets
GET http://localhost:3030/timesheets?status=submitted

# Get approved timesheets
GET http://localhost:3030/timesheets?status=approved_subcon

# Get draft timesheets
GET http://localhost:3030/timesheets?status=draft
```

### Get Timesheets by Worker
```bash
GET http://localhost:3030/timesheets?worker=<worker_id>
Authorization: Bearer <token>
```

### Get Timesheets by Date Range
```bash
GET http://localhost:3030/timesheets?date[$gte]=2025-11-01&date[$lte]=2025-11-30
Authorization: Bearer <token>
```

### Get Single Timesheet
```bash
GET http://localhost:3030/timesheets/<timesheet_id>
Authorization: Bearer <token>
```

### Create Timesheet
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
  "description": "Construction work at Site A",
  "status": "submitted",
  "project": {
    "name": "Building Construction",
    "code": "PROJ-001",
    "location": "Kuala Lumpur"
  }
}
```

**Note:** Company is auto-assigned for subcon-admin. Conflicts are automatically detected.

### Update Timesheet
```bash
PATCH http://localhost:3030/timesheets/<timesheet_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "normalHours": 7,
  "ot1_5Hours": 2,
  "description": "Updated work description",
  "notes": "Revised hours after review"
}
```

### Approve Timesheet (Subcon Admin)
```bash
POST http://localhost:3030/timesheets/<timesheet_id>/approve
Authorization: Bearer <subcon_admin_token>
Content-Type: application/json

{
  "comments": "Approved - hours verified"
}
```

**Requirements:**
- Timesheet must be in `submitted` status
- User must be subcon-admin
- Changes status to `approved_subcon`

### Approve Timesheet (System Admin - Final)
```bash
POST http://localhost:3030/timesheets/<timesheet_id>/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "comments": "Final approval for payroll processing"
}
```

**Requirements:**
- Timesheet must be in `approved_subcon` status
- User must be admin
- Changes status to `approved_admin`

### Reject Timesheet
```bash
POST http://localhost:3030/timesheets/<timesheet_id>/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "comments": "Hours don't match attendance records - please revise"
}
```

**Can be done by:** subcon-admin or admin
**Changes status to:** `rejected`

### Delete Timesheet (Soft Delete)
```bash
DELETE http://localhost:3030/timesheets/<timesheet_id>
Authorization: Bearer <token>
```

**Note:** This is a soft delete - sets `isDeleted: true`

---

## 10. Timesheet Query Examples

### Get Conflicting Timesheets
```bash
GET http://localhost:3030/timesheets?isConflict=true
Authorization: Bearer <token>
```

### Get Timesheets Awaiting Approval
```bash
# Awaiting subcon approval
GET http://localhost:3030/timesheets?status=submitted

# Awaiting admin approval
GET http://localhost:3030/timesheets?status=approved_subcon
```

### Get Timesheets with OT
```bash
# Has OT 1.5x hours
GET http://localhost:3030/timesheets?ot1_5Hours[$gt]=0

# Has OT 2.0x hours
GET http://localhost:3030/timesheets?ot2_0Hours[$gt]=0
```

### Get Timesheets by Total Hours
```bash
# More than 8 hours
GET http://localhost:3030/timesheets?totalHours[$gt]=8

# Between 8 and 12 hours
GET http://localhost:3030/timesheets?totalHours[$gte]=8&totalHours[$lte]=12
```

### Populate Related Data
```bash
# Populate worker details
GET http://localhost:3030/timesheets?$populate=worker

# Populate company and worker
GET http://localhost:3030/timesheets?$populate[]=company&$populate[]=worker

# Populate approval history users
GET http://localhost:3030/timesheets?$populate=approvalHistory.approvedBy
```

---

## 11. Timesheet Testing Scenarios

### Scenario 1: Submit and Approve Workflow
1. Login as subcon admin
2. Create timesheet with status `draft`
3. Update status to `submitted`
4. Approve as subcon admin (status → `approved_subcon`)
5. Login as system admin
6. Approve as admin (status → `approved_admin`)

### Scenario 2: Conflict Detection
1. Create timesheet: 08:00 - 17:00
2. Try to create overlapping timesheet: 16:00 - 20:00
3. Check `isConflict` flag is true
4. Check `conflictWith` array contains first timesheet ID

### Scenario 3: Rejection Workflow
1. Create and submit timesheet
2. Reject as subcon admin with comments
3. Check status is `rejected`
4. Check approval history contains rejection entry

---

**Happy Testing!** 🚀

