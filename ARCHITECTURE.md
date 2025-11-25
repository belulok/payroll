# System Architecture

## Overview

The Payroll System is built using a modern full-stack architecture with clear separation between frontend and backend.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Web Browser (http://localhost:3000)         │  │
│  │                                                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐      │  │
│  │  │   Login    │  │  Register  │  │  Dashboard   │      │  │
│  │  │   Page     │  │    Page    │  │     Page     │      │  │
│  │  └────────────┘  └────────────┘  └──────────────┘      │  │
│  │                                                          │  │
│  │              Next.js 14 + React 18 + TypeScript         │  │
│  │                    TailwindCSS Styling                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST + WebSocket
                              │ (Feathers Client)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         FeathersJS Server (http://localhost:3030)        │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │              Authentication Layer                  │ │  │
│  │  │  • JWT Strategy                                    │ │  │
│  │  │  • Local Strategy (email/password)                 │ │  │
│  │  │  • Password Hashing (bcryptjs)                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │              Authorization Layer                   │ │  │
│  │  │  • Role-based Access Control                       │ │  │
│  │  │  • Permission Hooks                                │ │  │
│  │  │  • Roles: admin, agent, user                       │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │                 Services Layer                     │ │  │
│  │  │                                                    │ │  │
│  │  │  ┌──────────────┐      ┌──────────────┐          │ │  │
│  │  │  │    Users     │      │   Payroll    │          │ │  │
│  │  │  │   Service    │      │   Service    │          │ │  │
│  │  │  │              │      │              │          │ │  │
│  │  │  │ • Create     │      │ • Create     │          │ │  │
│  │  │  │ • Read       │      │ • Read       │          │ │  │
│  │  │  │ • Update     │      │ • Update     │          │ │  │
│  │  │  │ • Delete     │      │ • Delete     │          │ │  │
│  │  │  └──────────────┘      └──────────────┘          │ │  │
│  │  │                                                    │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  Express.js + Socket.io + CORS                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      MongoDB (mongodb://localhost:27017/payroll)         │  │
│  │                                                          │  │
│  │  ┌──────────────┐              ┌──────────────┐         │  │
│  │  │    Users     │              │   Payroll    │         │  │
│  │  │  Collection  │              │  Collection  │         │  │
│  │  │              │              │              │         │  │
│  │  │ • _id        │              │ • _id        │         │  │
│  │  │ • email      │              │ • userId     │         │  │
│  │  │ • password   │              │ • employeeId │         │  │
│  │  │ • firstName  │              │ • period     │         │  │
│  │  │ • lastName   │              │ • salary     │         │  │
│  │  │ • role       │              │ • allowances │         │  │
│  │  │ • employeeId │              │ • deductions │         │  │
│  │  │ • department │              │ • grossPay   │         │  │
│  │  │ • position   │              │ • netPay     │         │  │
│  │  │ • salary     │              │ • status     │         │  │
│  │  │ • timestamps │              │ • timestamps │         │  │
│  │  └──────────────┘              └──────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. User Registration
```
Browser → POST /users → Users Service → Hash Password → MongoDB
                                                          ↓
Browser ← JWT Token ← Authentication ← Create User ← MongoDB
```

### 2. User Login
```
Browser → POST /authentication → Local Strategy → Verify Password
                                                          ↓
Browser ← JWT Token ← Generate Token ← User Found ← MongoDB
```

### 3. Authenticated Request
```
Browser → GET /payroll (with JWT) → Verify JWT → Check Permissions
                                                          ↓
Browser ← Payroll Data ← Format Response ← Query ← MongoDB
```

### 4. Create Payroll (Admin/Agent)
```
Browser → POST /payroll (with JWT) → Verify JWT → Check Role
                                                          ↓
                                    Check Permissions (admin/agent)
                                                          ↓
Browser ← Created Record ← Save to DB ← Validate ← MongoDB
```

## Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **HTTP Client:** Axios
- **API Client:** FeathersJS Client
- **State Management:** React Hooks (useState, useEffect)
- **Routing:** Next.js App Router

### Backend
- **Framework:** FeathersJS 5
- **Runtime:** Node.js
- **Web Server:** Express.js
- **Real-time:** Socket.io
- **Authentication:** JWT + Local Strategy
- **Password Hashing:** bcryptjs
- **CORS:** cors middleware
- **Configuration:** @feathersjs/configuration

### Database
- **Database:** MongoDB
- **ODM:** Mongoose
- **Driver:** feathers-mongoose

## Security Features

1. **Password Security**
   - Passwords hashed with bcryptjs (10 rounds)
   - Never stored in plain text
   - Never sent to client

2. **Authentication**
   - JWT tokens for stateless authentication
   - Tokens stored in localStorage
   - Automatic re-authentication on page load

3. **Authorization**
   - Role-based access control (RBAC)
   - Permission checks on all protected routes
   - Service-level authorization hooks

4. **API Security**
   - CORS enabled for cross-origin requests
   - Protected endpoints require authentication
   - Role-based endpoint restrictions

## Scalability Considerations

1. **Horizontal Scaling**
   - Stateless JWT authentication allows multiple backend instances
   - MongoDB supports replica sets for high availability

2. **Caching**
   - Ready for Redis integration for session management
   - Can add caching layer for frequently accessed data

3. **Load Balancing**
   - Backend can run behind load balancer
   - Socket.io supports sticky sessions

4. **Database**
   - MongoDB indexes on frequently queried fields
   - Pagination implemented for large datasets

## Development vs Production

### Development
- Hot reload enabled (Next.js, nodemon)
- Detailed error messages
- Source maps enabled
- Development MongoDB instance

### Production (Recommendations)
- Build Next.js for production: `npm run build`
- Use PM2 or similar for backend process management
- Enable MongoDB authentication
- Use environment-specific secrets
- Enable HTTPS
- Set up proper logging
- Configure MongoDB replica sets
- Use CDN for static assets
- Enable compression
- Set up monitoring and alerts

