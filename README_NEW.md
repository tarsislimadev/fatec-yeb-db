# Phone List System - MVP ✅ COMPLETE

A production-ready full-stack application for managing phone numbers with relationships to people, businesses, and departments. Built with React, Node.js, PostgreSQL, and Docker.

**Status**: ✅ Complete  
**Version**: 1.0.0  
**Date**: April 22, 2026

---

## 🎯 Quick Navigation

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - 📊 Complete overview (START HERE!)
- **[QUICKSTART.md](./QUICKSTART.md)** - ⚡ 5-minute setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 🚀 Production deployment
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - 🛠️ Development guide
- **[CHANGELOG.md](./CHANGELOG.md)** - 📝 Version history & Phase 2 roadmap

---

## 🚀 Start Here

### Option 1: Docker (Recommended)
```bash
docker-compose up
# Frontend: http://localhost
# API: http://localhost:3000
# Test User: test@example.com / Password123!
```

### Option 2: Manual Setup
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev

# Database (if not using Docker)
cd backend && npm run migrate && npm run seed
```

---

## ✨ What's Included

### Backend REST API (17 Endpoints)
- 5 authentication endpoints (signup, signin, logout, password recovery)
- 7 phone management endpoints (CRUD + relationships)
- 5 relationship management endpoints (owners, channels, consents)

**Stack**: Node.js 18+, Express 4.18, PostgreSQL 14+, Redis 6+

### Frontend React App (6 Pages)
- Login / Signup pages with validation
- Phone list page with search, filter, pagination
- Phone detail page with tabbed interface
- Password reset flow
- Responsive design with Tailwind CSS

**Stack**: React 18, Vite, Zustand, Axios, Tailwind CSS

### Infrastructure
- Docker & Docker Compose for full stack
- PostgreSQL database (12 tables)
- Redis caching (token blacklist)
- Nginx for SPA routing and API proxying

---

## 📊 Architecture

```
┌────────────────────────────────────────────┐
│  Frontend: React + Vite + Tailwind CSS     │
│  (6 pages: Login, Signup, Phones, etc)     │
└──────────┬─────────────────────────────────┘
           │ (HTTP/JSON)
           ↓
┌──────────────────────────────────────────────┐
│  Backend: Node.js + Express (17 endpoints)   │
│  Auth: JWT + bcrypt + Account Lockout        │
│  Database: PostgreSQL (12 tables)            │
│  Cache: Redis (token blacklist)              │
└──────────────────────────────────────────────┘
```

---

## 🔐 Security Features

- ✅ JWT token authentication (1 hour expiration)
- ✅ Bcrypt password hashing (10 rounds, slow hash)
- ✅ Account lockout (5 failed attempts → 15 min lock)
- ✅ Single-use password reset tokens
- ✅ Token blacklisting on logout
- ✅ CORS for frontend origin only
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React auto-escaping)

---

## 📁 Project Structure

```
.
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/             # 17 endpoints
│   │   ├── utils/              # JWT, validation
│   │   ├── db/                 # Schema, migration
│   │   └── __tests__/          # Integration tests
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                   # React Vite SPA
│   ├── src/
│   │   ├── pages/              # 6 pages
│   │   ├── components/         # UI components
│   │   ├── services/           # API client
│   │   ├── store/              # State management
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
│
├── docs/                       # Project documentation
├── docker-compose.yml          # Full stack orchestration
└── [Documentation files]
```

---

## 🧪 Test the Application

### Test User
```
Email: test@example.com
Password: Password123!
```

### Test Scenarios
1. **Login** - Use test credentials
2. **Create Phone** - Add a new phone number
3. **List Phones** - View with pagination and search
4. **View Details** - Click phone to see full details
5. **Update Phone** - Change type or status
6. **Delete Phone** - Soft delete (marked inactive)
7. **Logout** - Sign out and verify redirect to login

See [QUICKSTART.md](./QUICKSTART.md#testing-the-mvp) for complete testing guide.

---

## 🛠️ Development

### Install & Setup
```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run migrate
npm run seed

# Frontend
cd frontend
npm install
```

### Start Development Servers
```bash
# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)
cd frontend && npm run dev
```

### Scripts
```bash
# Backend
npm run dev          # Start with hot reload
npm run migrate      # Initialize database
npm run seed         # Populate test data
npm test             # Run tests
npm run lint         # Check code style

# Frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # Check code style
```

---

## 📚 API Documentation

### Response Format
```json
{
  "data": {...},
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 100,
    "total_pages": 5
  }
}
```

### Key Endpoints
```
POST   /api/v1/auth/signup              # Create account
POST   /api/v1/auth/signin              # Login
POST   /api/v1/auth/signout             # Logout

GET    /api/v1/phones                   # List phones
POST   /api/v1/phones                   # Create phone
GET    /api/v1/phones/:id               # Get details
PATCH  /api/v1/phones/:id               # Update
DELETE /api/v1/phones/:id               # Delete

POST   /api/v1/phones/:id/owners        # Add owner
DELETE /api/v1/phones/:id/owners/:id    # Remove owner
```

See [backend/README.md](./backend/README.md) for full API documentation with examples.

---

## 🚀 Deployment

### Docker (Development & Production)
```bash
docker-compose up
```

### Production (Linux)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Systemd service setup
- Nginx reverse proxy
- SSL/TLS with Let's Encrypt
- Database backup
- Monitoring & logging

### Cloud Platforms
- Azure App Service + Azure Database + Azure Cache
- AWS Elastic Beanstalk + RDS + ElastiCache
- GCP App Engine + Cloud SQL + Cloud Cache
- Heroku with Procfile

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guides.

---

## 📊 Database Schema

### Core Tables
- **phones** - E.164 format, type (mobile/landline/whatsapp), status
- **app_users** - Email, password hash, account status, lockout tracking
- **phone_owners** - Relationships to people, businesses, departments

### Metadata Tables
- **phone_channels** - SMS, WhatsApp, Telegram, Signal
- **phone_consents** - Marketing, SMS, Call (granted/revoked/unknown)
- **phone_sources** - Where phone was discovered
- **contact_attempts** - Call/SMS/email history

### Authentication Tables
- **password_reset_tokens** - Single-use reset tokens
- **auth_identities** - OAuth providers (Phase 2)

### Supporting Tables
- **people** - Person records (for ownership)
- **businesses** - Business records (for ownership)
- **departments** - Department records (for ownership)

---

## ✅ Verification Checklist

Before deployment, verify:
- [x] Backend compiles without errors
- [x] Frontend compiles without errors
- [x] Docker build succeeds
- [x] Database migration works
- [x] Seed script populates test data
- [x] Login page works
- [x] API responds correctly
- [x] Documentation is complete
- [x] Contributing guide is clear

**Status**: ✅ All verified

---

## 📋 Phase 2 Roadmap

Planned features:
- OAuth integration (Google, Microsoft)
- Email verification for signup
- Multi-factor authentication
- Advanced search & filtering
- Bulk operations (import/export)
- Admin dashboard
- API rate limiting
- Audit logging
- Webhooks
- GraphQL API
- Kubernetes support
- CI/CD pipeline

See [CHANGELOG.md](./CHANGELOG.md#unreleased) for detailed Phase 2 roadmap.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Development workflow
- Testing requirements
- Commit message format
- Pull request process

---

## 📞 Support

### Documentation
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Complete overview
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick setup
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production setup
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development guide
- **[backend/README.md](./backend/README.md)** - API documentation
- **[frontend/README.md](./frontend/README.md)** - Frontend setup

### Issues & Questions
- Open a GitHub issue for bugs
- Start a discussion for questions
- Follow [CONTRIBUTING.md](./CONTRIBUTING.md) for bug reports

---

## 📄 License

See [LICENSE](./LICENSE) file.

---

**Version**: 1.0.0  
**Status**: ✅ MVP Complete & Ready  
**Last Updated**: April 22, 2026

---

# Original Project: FATEC YEB Database

This MVP is part of the FATEC YEB Database project for automated commercial database validation.

## Original Objective

Automate the commercial database validation process through secondary and primary research to optimize business processes of MDRs and SDRs in prospect contact and product sales.

## Original Scope

- System for validating company databases (CNPJ, legal name, etc.)
- Dual validation formats (secondary and primary sources)
- Secondary research: company websites, specialized services, associations, news
- AI-driven contact information gathering (name, email, phone, position)
- Primary research: AI phone contact and WhatsApp chatbot interviews

See [docs/](./docs/) for original project documentation.
