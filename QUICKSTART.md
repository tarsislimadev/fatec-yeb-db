# Phone List System - Quick Start Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

## 5-Minute Setup (Local Development)

### 1. Clone and Install

```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

### 2. Database Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials:
# DATABASE_URL=postgresql://user:password@localhost:5432/phone_list
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-random-secret-key-min-32-chars
# FRONTEND_URL=http://localhost:5173

# Initialize database schema
npm run migrate

# Seed test data
npm run seed
```

### 3. Start Backend

```bash
cd backend
npm run dev
# Runs on http://localhost:3000
# Health check: curl http://localhost:3000/health
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 5. Login

Visit `http://localhost:5173` and login with:
- **Email**: `test@example.com`
- **Password**: `Password123!`

---

## Docker Quick Start (Recommended)

```bash
# One command to start entire stack
docker-compose up

# Frontend: http://localhost
# Backend API: http://localhost:3000
# Database: localhost:5432 (phone_user / phone_password)
# Redis: localhost:6379
```

Wait for all services to be healthy, then:

```bash
# In another terminal, seed the database
docker-compose exec backend npm run seed
```

Then visit `http://localhost` and login with:
- **Email**: `test@example.com`
- **Password**: `Password123!`

---

## API Endpoints

### Authentication

```bash
# Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "display_name": "John Doe"
  }'

# Signin
curl -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Signout (requires token)
curl -X POST http://localhost:3000/api/v1/auth/signout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Phones

```bash
# List phones (requires token)
curl http://localhost:3000/api/v1/phones \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create phone
curl -X POST http://localhost:3000/api/v1/phones \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "e164_number": "+5511987654321",
    "raw_number": "(11) 98765-4321",
    "type": "mobile"
  }'

# Get phone details
curl http://localhost:3000/api/v1/phones/PHONE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update phone
curl -X PATCH http://localhost:3000/api/v1/phones/PHONE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "whatsapp",
    "status": "inactive"
  }'

# Delete phone
curl -X DELETE http://localhost:3000/api/v1/phones/PHONE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## File Structure

```
.
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.js          ← Database connection
│   │   │   ├── schema.sql        ← Database schema
│   │   │   ├── migrate.js        ← Initialize schema
│   │   │   └── seed.js           ← Insert test data
│   │   ├── controllers/          ← Request handlers
│   │   ├── middleware/           ← Auth, error handling
│   │   ├── routes/               ← Route definitions
│   │   ├── utils/                ← Utilities
│   │   └── server.js             ← Express app
│   ├── package.json
│   ├── .env.example              ← Environment template
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/           ← UI components
│   │   ├── pages/                ← Page components
│   │   ├── services/             ← API client
│   │   ├── store/                ← State management
│   │   ├── App.jsx               ← Router
│   │   ├── main.jsx              ← Entry point
│   │   └── index.css             ← Styles
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
└── docker-compose.yml            ← Full stack
```

---

## Common Issues

### "Cannot connect to database"
- Check PostgreSQL is running: `psql -U postgres -d postgres`
- Verify DATABASE_URL in `.env`
- Run migration: `npm run migrate`

### "Cannot connect to Redis"
- Check Redis is running: `redis-cli ping` (should return PONG)
- Verify REDIS_URL in `.env`

### "Port 3000 already in use"
- Kill the process: `lsof -ti:3000 | xargs kill -9`
- Or use a different port: `PORT=3001 npm start`

### "Frontend can't reach backend"
- Check backend is running on port 3000
- Verify `vite.config.js` proxy points to correct URL
- Check browser console for CORS errors

---

## Development Scripts

### Backend

```bash
npm run dev          # Start with hot reload (nodemon)
npm run migrate      # Initialize database
npm run seed         # Populate test data
npm test             # Run tests
npm run lint         # Lint code
npm start            # Start production
```

### Frontend

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
```

---

## Testing the MVP

### Test User Account
```
Email: test@example.com
Password: Password123!
```

### Test Scenarios

1. **Login Flow**
   - Go to http://localhost:5173/login
   - Enter test credentials
   - Should redirect to phone list

2. **Create Phone**
   - Click "Add Phone"
   - Enter: `+5511987654321`
   - Select type: "Mobile"
   - Click "Create Phone"
   - Phone should appear in list

3. **View Phone Details**
   - Click any phone in the list
   - View tabs: Details, Owners, Channels, Consents
   - Edit features should be available

4. **Password Reset**
   - Go to http://localhost:5173/login
   - Click "Forgot password"
   - Enter email
   - (Email sending requires SENDGRID_API_KEY)

5. **Logout**
   - Click "Sign Out" button
   - Should redirect to login

---

## Next Steps

- Read [backend/README.md](./backend/README.md) for API details
- Read [frontend/README.md](./frontend/README.md) for UI details
- Check [docs/](./docs/) for design & spec documents
- Run tests: `npm test`
- Deploy with Docker Compose

---

## Support

- Backend API Docs: See `docs/api-spec.md`
- Database Schema: See `backend/src/db/schema.sql`
- Issues: Check GitHub issues

Happy coding! 🚀
