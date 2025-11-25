# 🔐 User Roles Explained - Payroll System

## 📋 Overview

Your system has **5 different user roles**, each with specific permissions and access levels:

1. **admin** - System Administrator
2. **agent** - Multi-Company Agent
3. **subcon-admin** - Subcontractor Company Administrator
4. **worker** - Employee/Worker
5. **user** - Default/Basic User (rarely used)

---

## 👤 Role Details

### 1. **ADMIN** (System Administrator)

**Who:** Platform owner, system administrator

**Access Level:** 🔴 **FULL ACCESS** - Highest level

**Permissions:**
- ✅ Access ALL companies
- ✅ View/Edit/Delete any data across the entire system
- ✅ Create/Manage companies
- ✅ Create/Manage users (all roles)
- ✅ Create/Manage workers for any company
- ✅ Approve/Reject timesheets for any company
- ✅ Generate payroll for any company
- ✅ View all reports and analytics
- ✅ System configuration and settings
- ✅ Subscription management

**Database Fields:**
```javascript
{
  role: 'admin',
  company: null,  // No company restriction
  worker: null
}
```

**Login Example:**
```
Email: admin@payroll.com
Password: admin123
```

**Use Case:**
- Platform owner managing the entire SaaS system
- Technical support staff
- Super admin for troubleshooting

---

### 2. **AGENT** (Multi-Company Agent)

**Who:** Sales agent, business development representative

**Access Level:** 🟠 **MULTI-COMPANY ACCESS**

**Permissions:**
- ✅ Access MULTIPLE companies (assigned to them)
- ✅ View all companies they manage
- ✅ Switch between companies via dropdown
- ✅ View workers, timesheets, payroll for their companies
- ✅ Generate payroll for their companies
- ✅ View reports for their companies
- ❌ Cannot create/delete companies
- ❌ Cannot access other agents' companies
- ❌ Cannot access system settings

**Database Fields:**
```javascript
{
  role: 'agent',
  company: null,  // No single company (can access multiple)
  worker: null
}

// Companies have agent reference:
Company {
  agent: ObjectId(agentUserId)
}
```

**How It Works:**
- Agent user is created with role 'agent'
- Companies are assigned to the agent via `company.agent` field
- Agent can see dropdown of all companies where `company.agent === agentUserId`
- Agent switches between companies to manage them

**Use Case:**
- Sales agent managing 10 subcontractor companies
- Business development rep overseeing multiple clients
- Account manager handling several companies

---

### 3. **SUBCON-ADMIN** (Subcontractor Company Administrator)

**Who:** Company owner, HR manager, company administrator

**Access Level:** 🟡 **SINGLE COMPANY ACCESS**

**Permissions:**
- ✅ Full access to THEIR company only
- ✅ Create/Edit/Delete workers in their company
- ✅ Create/Edit timesheets for their workers
- ✅ Approve/Reject timesheets (first level approval)
- ✅ View payroll for their workers
- ✅ Manage leave types and holidays
- ✅ Approve/Reject leave requests
- ✅ Generate QR codes for check-in
- ✅ Edit company settings (payroll settings, etc.)
- ❌ Cannot access other companies
- ❌ Cannot create companies
- ❌ Cannot change subscription plans (admin only)

**Database Fields:**
```javascript
{
  role: 'subcon-admin',
  company: ObjectId(companyId),  // Locked to one company
  worker: null
}
```

**Login Example:**
```
Email: subcon.admin@example.com
Password: subcon123
Company: ABC Construction Sdn Bhd
```

**Use Case:**
- Company owner managing their own workers
- HR manager handling payroll and timesheets
- Office manager overseeing daily operations

---

### 4. **WORKER** (Employee)

**Who:** Regular employee, construction worker, staff member

**Access Level:** 🟢 **SELF-ACCESS ONLY**

**Permissions:**
- ✅ View their OWN profile
- ✅ View their OWN timesheets
- ✅ View their OWN payroll/payslips
- ✅ Submit leave requests
- ✅ View their leave balance
- ✅ Check-in/Check-out (QR code or manual)
- ✅ Submit unit records (for unit-based workers)
- ❌ Cannot view other workers' data
- ❌ Cannot approve timesheets
- ❌ Cannot generate payroll
- ❌ Cannot access company settings

**Database Fields:**
```javascript
{
  role: 'worker',
  company: ObjectId(companyId),  // Their company
  worker: ObjectId(workerId)     // Their worker record
}
```

**Login Examples:**
```
Monthly Salary Worker:
Email: sarah.wong@example.com
Password: worker123

Hourly Worker:
Email: ahmad@example.com
Password: worker123

Unit-Based Worker:
Email: muthu.rajan@example.com
Password: worker123
```

**Use Case:**
- Construction worker checking in/out daily
- Office staff viewing their payslips
- Employee submitting leave requests

---

### 5. **USER** (Default/Basic User)

**Who:** Rarely used, default role

**Access Level:** ⚪ **MINIMAL ACCESS**

**Permissions:**
- ✅ Login to system
- ❌ Very limited access (mostly placeholder)

**Database Fields:**
```javascript
{
  role: 'user',
  company: null,
  worker: null
}
```

**Use Case:**
- Default role when creating a user
- Placeholder for future custom roles
- Rarely used in practice

---

## 🔒 Permission Matrix

| Feature | Admin | Agent | Subcon-Admin | Worker | User |
|---------|-------|-------|--------------|--------|------|
| **Companies** |
| View All Companies | ✅ | ✅ (assigned) | ❌ | ❌ | ❌ |
| Create Company | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit Company | ✅ | ❌ | ✅ (own) | ❌ | ❌ |
| Delete Company | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Workers** |
| View Workers | ✅ (all) | ✅ (assigned) | ✅ (own company) | ❌ | ❌ |
| Create Worker | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Worker | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Worker | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Timesheets** |
| View All Timesheets | ✅ | ✅ (assigned) | ✅ (own company) | ✅ (own) | ❌ |
| Create Timesheet | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| Approve Timesheet | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Payroll** |
| View Payroll | ✅ (all) | ✅ (assigned) | ✅ (own company) | ✅ (own) | ❌ |
| Generate Payroll | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Payroll | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Leave** |
| Submit Leave Request | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Leave | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Leave Types | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Settings** |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company Settings | ✅ | ❌ | ✅ (own) | ❌ | ❌ |
| Subscription | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🎯 Common Scenarios

### **Scenario 1: New Company Onboarding**
1. **Admin** creates a new company
2. **Admin** creates a subcon-admin user for that company
3. **Subcon-Admin** logs in and creates workers
4. **Workers** receive login credentials and can access their data

### **Scenario 2: Agent Managing Multiple Companies**
1. **Admin** creates an agent user
2. **Admin** assigns companies to the agent (sets `company.agent`)
3. **Agent** logs in and sees dropdown of all their companies
4. **Agent** switches between companies to manage them

### **Scenario 3: Daily Worker Check-in**
1. **Worker** arrives at site
2. **Worker** scans company QR code or logs in
3. **Worker** checks in (creates timesheet)
4. **Worker** checks out at end of day
5. **Subcon-Admin** reviews and approves timesheet
6. **Agent/Admin** generates payroll at month-end

---

## 📝 Summary

**Role Hierarchy (Highest to Lowest):**
1. **Admin** - God mode, full access
2. **Agent** - Multi-company access
3. **Subcon-Admin** - Single company access
4. **Worker** - Self-access only
5. **User** - Minimal access

**Key Differences:**
- **Admin vs Agent**: Admin can create companies, Agent cannot
- **Agent vs Subcon-Admin**: Agent manages multiple companies, Subcon-Admin manages one
- **Subcon-Admin vs Worker**: Subcon-Admin manages workers, Worker is managed

**Current Test Accounts:**
- 1 Admin
- 0 Agents (you can create)
- 1 Subcon-Admin
- 6 Workers (2 monthly, 2 hourly, 2 unit-based)

