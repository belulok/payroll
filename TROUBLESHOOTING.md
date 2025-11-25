# Troubleshooting Guide

## Common Issues and Solutions

### 1. MongoDB Connection Error

**Error Message:**
```
MongoDB connection error: MongoServerError: connect ECONNREFUSED
```

**Solutions:**
- Ensure MongoDB is installed and running
- Check if MongoDB service is active:
  - Windows: Check Services (services.msc) for "MongoDB Server"
  - Or start manually: `mongod --dbpath C:\data\db`
- Verify MongoDB is accessible at `mongodb://localhost:27017`
- Check firewall settings

### 2. Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3030
```

**Solutions:**

**For Backend (Port 3030):**
```powershell
# Find process using port 3030
netstat -ano | findstr :3030

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**For Frontend (Port 3000):**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### 3. Module Not Found Errors

**Error Message:**
```
Error: Cannot find module '@feathersjs/feathers'
```

**Solutions:**
```bash
# Reinstall backend dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

# Reinstall frontend dependencies
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### 4. Authentication Errors

**Error Message:**
```
Error: Invalid login
```

**Solutions:**
- Ensure you've created the admin user: `node seed-admin.js`
- Check credentials:
  - Email: admin@payroll.com
  - Password: admin123
- Clear browser localStorage and try again
- Check if backend is running and accessible

### 5. CORS Errors

**Error Message:**
```
Access to fetch at 'http://localhost:3030' has been blocked by CORS policy
```

**Solutions:**
- Ensure backend is running
- Check `.env.local` in frontend has correct API URL
- Restart both servers
- Clear browser cache

### 6. Next.js Build Errors

**Error Message:**
```
Error: Module not found: Can't resolve '@/lib/feathers'
```

**Solutions:**
- Check `tsconfig.json` has correct path mappings
- Ensure all files are in correct locations
- Restart the dev server
- Clear Next.js cache: `rm -rf .next`

### 7. Database Seeding Issues

**Error Message:**
```
Admin user already exists!
```

**Solutions:**
- This is normal if you've already run the seed script
- To reset, connect to MongoDB and drop the users collection:
```javascript
// In MongoDB shell
use payroll
db.users.drop()
```
- Then run seed script again

### 8. TypeScript Errors in Frontend

**Error Message:**
```
Type 'X' is not assignable to type 'Y'
```

**Solutions:**
- Check `tsconfig.json` configuration
- Install missing type definitions:
```bash
npm install -D @types/node @types/react
```
- Restart TypeScript server in VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

### 9. Tailwind CSS Not Working

**Symptoms:**
- Styles not applying
- Classes not working

**Solutions:**
- Check `tailwind.config.js` content paths
- Ensure `globals.css` imports Tailwind directives
- Restart dev server
- Clear browser cache

### 10. Cannot Access Dashboard

**Symptoms:**
- Redirected to login page
- "You must be logged in" error

**Solutions:**
- Ensure you're logged in
- Check browser localStorage for `feathers-jwt` token
- Try logging out and logging in again
- Clear browser localStorage and cookies

## Checking System Status

### Verify Backend is Running
```bash
curl http://localhost:3030
```
Should return Feathers application info.

### Verify Frontend is Running
Open browser to `http://localhost:3000`

### Check MongoDB Connection
```bash
# Using MongoDB shell
mongosh
use payroll
db.users.find()
```

## Getting Help

If you're still experiencing issues:

1. Check the console logs in both backend and frontend terminals
2. Check browser console (F12) for JavaScript errors
3. Review the main README.md for configuration details
4. Ensure all prerequisites are installed:
   - Node.js v18+
   - MongoDB
   - npm

## Useful Commands

### Backend
```bash
# Start backend
cd backend
node src/index.js

# Create admin user
node seed-admin.js

# Check dependencies
npm list
```

### Frontend
```bash
# Start frontend
cd frontend
npx next dev

# Build for production
npm run build

# Check dependencies
npm list
```

### MongoDB
```bash
# Start MongoDB
mongod --dbpath C:\data\db

# Connect to MongoDB shell
mongosh

# Check database
use payroll
show collections
db.users.find()
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3030
MONGODB_URI=mongodb://localhost:27017/payroll
JWT_SECRET=your-secret-key-change-this-in-production
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3030
```

Make sure these files exist and have correct values!

