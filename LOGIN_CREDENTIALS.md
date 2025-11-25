# 🔐 Login Credentials - Payroll System

## 🏢 Company Information
**Company Name:** ABC Construction Sdn Bhd  
**Registration:** ROC123456  
**QR Code:** (Generated after running seed-phase4.js)

---

## 👤 System Admin
**Role:** Full system access  
**Email:** `admin@payroll.com`  
**Password:** `admin123`

---

## 👔 Subcontractor Admin
**Role:** Company administrator  
**Email:** `subcon.admin@example.com`  
**Password:** `subcon123`  
**Name:** John Tan  
**Company:** ABC Construction Sdn Bhd

---

## 👷 Workers

### 📊 Type 1: Monthly Salary Workers

#### 1. Sarah Wong - Office Manager
- **Email:** `sarah.wong@example.com`
- **Password:** `worker123`
- **Employee ID:** MS001
- **Department:** Administration
- **Monthly Salary:** RM 4,500
- **Leave Tier:** Manager (24 days Annual Leave)
- **Bank:** Maybank - 1234567890

#### 2. David Lim - HR Executive
- **Email:** `david.lim@example.com`
- **Password:** `worker123`
- **Employee ID:** MS002
- **Department:** Human Resources
- **Monthly Salary:** RM 3,800
- **Leave Tier:** Senior (18 days Annual Leave)
- **Bank:** CIMB - 2345678901

---

### ⏰ Type 2: Hourly Workers

#### 3. Ahmad Ibrahim - Construction Worker
- **Email:** `ahmad@example.com`
- **Password:** `worker123`
- **Employee ID:** W001
- **Department:** Construction
- **Hourly Rate:** RM 15.00/hour
- **Bank:** Public Bank - 3456789012

#### 4. Kumar Subramaniam - Site Supervisor
- **Email:** `kumar@example.com`
- **Password:** `worker123`
- **Employee ID:** W002
- **Department:** Construction
- **Hourly Rate:** RM 25.00/hour
- **Bank:** RHB Bank - 4567890123

#### 5. Lee Wei Ming - Electrician
- **Email:** `lee@example.com`
- **Password:** `worker123`
- **Employee ID:** W003
- **Department:** Electrical
- **Hourly Rate:** RM 20.00/hour
- **Bank:** (To be added)

---

### 📦 Type 3: Unit-Based Workers

#### 6. Muthu Rajan - Bricklayer
- **Email:** `muthu.rajan@example.com`
- **Password:** `worker123`
- **Employee ID:** UB001
- **Department:** Construction
- **Unit Rates:**
  - Bricks Laid: RM 0.50/unit
  - Blocks Laid: RM 0.75/unit
- **Bank:** Hong Leong Bank - 5678901234

#### 7. Siti Aminah - Seamstress
- **Email:** `siti.aminah@example.com`
- **Password:** `worker123`
- **Employee ID:** UB002
- **Department:** Production
- **Unit Rates:**
  - Shirts Sewn: RM 5.00/unit
  - Pants Sewn: RM 7.50/unit
- **Bank:** AmBank - 6789012345

---

## 📋 Leave Types (For Monthly Salary Workers)

| Leave Type | Code | Days Allowed | Paid | Carry Forward |
|------------|------|--------------|------|---------------|
| Annual Leave | AL | 12/18/24 (tiered) | ✅ Yes | ✅ Yes (max 5 days) |
| Sick Leave | SL | 14 days | ✅ Yes | ❌ No |
| Emergency Leave | EL | 5 days | ✅ Yes | ❌ No |
| Unpaid Leave | UL | Unlimited | ❌ No | ❌ No |

### Leave Tiers:
- **Junior:** 12 days Annual Leave (0-2 years service)
- **Senior:** 18 days Annual Leave (3-5 years service)
- **Manager:** 24 days Annual Leave (5+ years service)

---

## 🎉 Gazetted Holidays 2025 (14 days)

1. New Year's Day - Jan 1
2. Chinese New Year - Jan 29-30
3. Hari Raya Aidilfitri - Mar 31, Apr 1
4. Labour Day - May 1
5. Wesak Day - May 12
6. Yang di-Pertuan Agong's Birthday - Jun 7
7. Hari Raya Aidiladha - Jun 7
8. Awal Muharram - Jun 27
9. Merdeka Day - Aug 31
10. Malaysia Day - Sep 16
11. Deepavali - Oct 20
12. Christmas Day - Dec 25

---

## 🚀 How to Run Seed Scripts

```bash
# 1. Run Phase 1 (Admin, Company, Basic Workers)
cd backend
node seed-phase1.js

# 2. Run Phase 4 (Payment Types, Leave System, Worker Logins)
node seed-phase4.js
```

---

## 🔑 Quick Test Logins

**For testing as Admin:**
```
Email: admin@payroll.com
Password: admin123
```

**For testing as Company Admin:**
```
Email: subcon.admin@example.com
Password: subcon123
```

**For testing as Monthly Salary Worker:**
```
Email: sarah.wong@example.com
Password: worker123
```

**For testing as Hourly Worker:**
```
Email: ahmad@example.com
Password: worker123
```

**For testing as Unit-Based Worker:**
```
Email: muthu.rajan@example.com
Password: worker123
```

---

## 📝 Notes

- All worker passwords are set to `worker123` for easy testing
- Workers can log in and view their own timesheets, payroll, and leave balances
- Monthly salary workers can submit leave requests
- Hourly workers can view their timesheets (QR code check-in required)
- Unit-based workers can submit unit records for approval
- Company admin can manage all workers and approve requests

---

**Last Updated:** 2025-11-24

