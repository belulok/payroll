# Quick Start Guide

## Prerequisites
1. Make sure MongoDB is installed and running
2. Node.js is installed (v18+)

## Step-by-Step Instructions

### 1. Start MongoDB
Make sure MongoDB is running on your system. If not installed, download from https://www.mongodb.com/try/download/community

### 2. Open Terminal/PowerShell in the project root directory
```
cd C:\Users\belul\Downloads\payroll
```

### 3. Start Backend Server

Open a new terminal window and run:
```bash
cd backend
node src/index.js
```

You should see:
```
Connected to MongoDB
Feathers application started on http://localhost:3030
```

### 4. Create Admin User (First Time Only)

Open another terminal window and run:
```bash
cd backend
node seed-admin.js
```

This creates an admin account:
- **Email:** admin@payroll.com
- **Password:** admin123

### 5. Start Frontend Server

Open another terminal window and run:
```bash
cd frontend
npx next dev
```

You should see:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 6. Access the Application

Open your browser and go to:
```
http://localhost:3000
```

### 7. Login

Use the admin credentials:
- Email: `admin@payroll.com`
- Password: `admin123`

## Automated Start (Windows)

Alternatively, you can use the PowerShell script:
```powershell
.\start-all.ps1
```

This will automatically open two terminal windows for backend and frontend.

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check if MongoDB is accessible at `mongodb://localhost:27017`

### Port Already in Use
- Backend (3030): Make sure no other application is using port 3030
- Frontend (3000): Make sure no other application is using port 3000

### Module Not Found Errors
Make sure all dependencies are installed:
```bash
cd backend
npm install

cd ../frontend
npm install
```

## Next Steps

After logging in, you can:
1. Create new users (admin only)
2. Create payroll records (admin/agent)
3. View dashboard statistics
4. Manage employee information

## Default User Roles

- **admin**: Full system access
- **agent**: Can create and manage payroll
- **user**: Can view their own payroll information

## Support

For more detailed information, see the main README.md file.

